-- =====================================================================
-- CLINIA APP · Migrazione 017: ore dei dottori al posto dell'abbonamento (24/11/2026).
--   · il dottore non paga abbonamento: Clinia firma con lui un pacchetto di ore
--   · Clinia registra il contratto firmato e le ore (richiesta), FPM le conferma (crediti)
--   · le ore scalano a ogni studio prenotato; FPM riceve 1,50 € netti per ogni ora accreditata
--   · consenso del dottore e canali di pubblicazione (monitor, sito, social: si attivano più avanti)
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
update public.app_settings set valore = valore || '{"euro_ora_netti":1.5,"base":"ore accreditate ai dottori"}'::jsonb, aggiornato_il = now()
where chiave = 'royalty_ore';
insert into public.app_settings (chiave, valore) values ('abbonamento_specialista_attivo', '{"attivo":false}')
on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now();

create table if not exists public.crediti_ore (
  id              uuid primary key default gen_random_uuid(),
  specialist_id   text not null references public.specialists(id) on delete cascade,
  ore             numeric(7,2) not null check (ore > 0 and ore <= 2000),
  data_contratto  date not null default current_date,
  contratto_path  text,                                   -- file nello storage privato di Clinia
  stato           text not null default 'richiesta' check (stato in ('richiesta','confermata','rifiutata')),
  inserito_da     text not null default 'clinia' check (inserito_da in ('clinia','fpm')),
  creato_il       timestamptz not null default now(),
  confermato_il   timestamptz
);
create index if not exists crediti_ore_spec on public.crediti_ore(specialist_id);
alter table public.crediti_ore enable row level security;

drop policy if exists crediti_lettura on public.crediti_ore;
drop policy if exists crediti_clinia on public.crediti_ore;
drop policy if exists crediti_fpm on public.crediti_ore;
create policy crediti_lettura on public.crediti_ore for select using (
  public.sono_titolare() or public.sono_admin()
  or exists (select 1 from public.specialists s where s.id = specialist_id and s.user_id = auth.uid()));
create policy crediti_clinia on public.crediti_ore for insert with check (public.sono_titolare() and stato = 'richiesta' and inserito_da = 'clinia');
create policy crediti_fpm on public.crediti_ore for all using (public.sono_admin()) with check (public.sono_admin());

-- Ore del dottore: accreditate, prenotate, disponibili
create or replace view public.ore_dottori with (security_invoker = true) as
select s.id as specialist_id,
       coalesce((select sum(c.ore) from public.crediti_ore c where c.specialist_id = s.id and c.stato = 'confermata'), 0) as ore_accreditate,
       coalesce((select sum(extract(epoch from (b.fine - b.inizio)) / 3600) from public.room_bookings b
                 where b.specialist_id = s.id and b.stato = 'confermata'), 0)::numeric(9,2) as ore_prenotate
from public.specialists s;

-- Non si prenota uno studio oltre le ore disponibili (il titolare non ha limiti)
create or replace function public.studio_entro_ore() returns trigger
language plpgsql security definer set search_path = public as $$
declare acc numeric; usate numeric; tit boolean;
begin
  if new.stato <> 'confermata' then return new; end if;
  select coalesce(is_titolare, false) into tit from specialists where id = new.specialist_id;
  if tit then return new; end if;
  select coalesce(sum(ore), 0) into acc from crediti_ore where specialist_id = new.specialist_id and stato = 'confermata';
  select coalesce(sum(extract(epoch from (fine - inizio)) / 3600), 0) into usate from room_bookings
   where specialist_id = new.specialist_id and stato = 'confermata' and id <> new.id;
  if usate + extract(epoch from (new.fine - new.inizio)) / 3600 > acc then
    raise exception 'Ore non sufficienti: chiedi a Clinia un nuovo pacchetto' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists studio_entro_ore on public.room_bookings;
create trigger studio_entro_ore before insert or update of stato, inizio, fine on public.room_bookings
  for each row execute function public.studio_entro_ore();

-- Notifiche: richiesta a FPM, conferma al dottore e a Clinia
create or replace function public.notifiche_crediti() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text;
begin
  select nome_visualizzato into sp from specialists where id = new.specialist_id;
  if tg_op = 'INSERT' and new.stato = 'richiesta' then
    perform notifica_fpm('ore', 'Ore da confermare', coalesce(sp, '') || ': ' || replace(new.ore::text, '.', ',') || ' h firmate. Confermale in Dottori.');
  elsif new.stato = 'confermata' and (tg_op = 'INSERT' or old.stato <> 'confermata') then
    insert into notifiche (per_specialista, tipo, titolo, testo) values (new.specialist_id, 'ore', 'Ore accreditate',
      replace(new.ore::text, '.', ',') || ' h attive: scalano a ogni studio prenotato.');
    insert into notifiche (per_ruolo, tipo, titolo, testo) values ('titolare', 'ore', 'Ore confermate da FPM',
      coalesce(sp, '') || ': ' || replace(new.ore::text, '.', ',') || ' h.');
  end if;
  return new;
end $$;
drop trigger if exists notifiche_crediti on public.crediti_ore;
create trigger notifiche_crediti after insert or update of stato on public.crediti_ore
  for each row execute function public.notifiche_crediti();

-- Consenso del dottore e canali di pubblicazione (spenti finché non colleghiamo monitor, sito e social)
alter table public.specialists add column if not exists consenso_pubblicazione boolean not null default false;
alter table public.specialists add column if not exists pubblicazione jsonb not null default '{"monitor":false,"sito":false,"instagram":false,"facebook":false}';
alter table public.specialists add column if not exists foto_916_url text;

-- Calendario pubblico per sito clinia.it e monitor in sala: solo nome, studio, giorno e orario,
-- solo dei medici che hanno dato il consenso e hanno il canale "sito" acceso. Mai dati dei pazienti.
create or replace view public.calendario_pubblico as
select b.specialist_id, s.nome_visualizzato as medico, b.giorno, b.inizio, b.fine, r.nome as studio
from public.room_bookings b
join public.specialists s on s.id = b.specialist_id
left join public.rooms r on r.id = b.room_id
where b.stato = 'confermata' and b.giorno between current_date and current_date + 21
  and s.consenso_pubblicazione and coalesce((s.pubblicazione->>'sito')::boolean, false);
grant select on public.calendario_pubblico to anon, authenticated;
