-- =====================================================================
-- CLINIA APP · Migrazione 019: pacchetti di ore e sezione Società (26/11/2026).
--   · pacchetti mensili, settimanali, a ore o con ore libere, con data di inizio e scadenza
--   · il contatore scala a fine turno: conta il pacchetto attivo (l'ultimo confermato), un rinnovo lo fa ripartire
--   · società (aziende, società sportive, medici esterni occasionali) come soggetti con pacchetto, stanze e persone
--   · la conferma di FPM di un pacchetto abilita anche l'accesso del dottore o della società
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
alter table public.crediti_ore add column if not exists tipo text not null default 'ore' check (tipo in ('mensile','settimanale','ore','libere'));
alter table public.crediti_ore add column if not exists inizio date not null default current_date;
alter table public.crediti_ore add column if not exists scadenza date;

alter table public.specialists add column if not exists tipo_soggetto text not null default 'specialista' check (tipo_soggetto in ('specialista','societa'));
alter table public.specialists add column if not exists dati_societa jsonb;

-- Persone da visitare delle società: solo nome, cognome e una nota, mai dati sanitari
create table if not exists public.persone_societa (
  id            uuid primary key default gen_random_uuid(),
  societa_id    text not null references public.specialists(id) on delete cascade,
  nome          text not null,
  cognome       text not null default '',
  nota          text,
  creato_il     timestamptz not null default now()
);
alter table public.persone_societa enable row level security;
drop policy if exists persone_societa_proprie on public.persone_societa;
create policy persone_societa_proprie on public.persone_societa for all
  using (exists (select 1 from public.specialists s where s.id = societa_id and s.user_id = auth.uid()) or public.sono_titolare())
  with check (exists (select 1 from public.specialists s where s.id = societa_id and s.user_id = auth.uid()) or public.sono_titolare());

-- Pacchetto attivo e ore: fatte (turni finiti), in calendario, rimaste
drop view if exists public.ore_dottori;
create view public.ore_dottori with (security_invoker = true) as
with p as (
  select distinct on (c.specialist_id) c.* from public.crediti_ore c
  where c.stato = 'confermata' order by c.specialist_id, c.confermato_il desc nulls last, c.creato_il desc)
select s.id as specialist_id, p.tipo, p.ore, p.inizio, p.scadenza,
  coalesce((select sum(extract(epoch from (b.fine - b.inizio)) / 3600) from public.room_bookings b
    where b.specialist_id = s.id and b.stato = 'confermata' and b.giorno >= p.inizio and (p.scadenza is null or b.giorno < p.scadenza)
      and (b.giorno + b.fine) <= now()), 0)::numeric(9,2) as ore_fatte,
  coalesce((select sum(extract(epoch from (b.fine - b.inizio)) / 3600) from public.room_bookings b
    where b.specialist_id = s.id and b.stato = 'confermata' and b.giorno >= p.inizio and (p.scadenza is null or b.giorno < p.scadenza)
      and (b.giorno + b.fine) > now()), 0)::numeric(9,2) as ore_in_calendario
from public.specialists s left join p on p.specialist_id = s.id;

-- Prenotazione di una stanza: solo dentro il pacchetto attivo e nelle sue ore
create or replace function public.studio_entro_ore() returns trigger
language plpgsql security definer set search_path = public as $$
declare tit boolean; p record; usate numeric;
begin
  if new.stato <> 'confermata' then return new; end if;
  select coalesce(is_titolare, false) into tit from specialists where id = new.specialist_id;
  if tit then return new; end if;
  select * into p from crediti_ore where specialist_id = new.specialist_id and stato = 'confermata'
   order by confermato_il desc nulls last, creato_il desc limit 1;
  if p.id is null then raise exception 'Nessun pacchetto attivo: Clinia lo inserisce dopo la firma del contratto' using errcode = '23514'; end if;
  if new.giorno < p.inizio or (p.scadenza is not null and new.giorno >= p.scadenza) then
    raise exception 'Data fuori dal pacchetto: serve il rinnovo' using errcode = '23514'; end if;
  select coalesce(sum(extract(epoch from (fine - inizio)) / 3600), 0) into usate from room_bookings
   where specialist_id = new.specialist_id and stato = 'confermata' and id <> new.id
     and giorno >= p.inizio and (p.scadenza is null or giorno < p.scadenza);
  if usate + extract(epoch from (new.fine - new.inizio)) / 3600 > p.ore then
    raise exception 'Ore del pacchetto non sufficienti: rinnova in Clinia' using errcode = '23514'; end if;
  return new;
end $$;

-- La conferma di FPM di un pacchetto abilita anche l'accesso
create or replace function public.abilita_con_pacchetto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stato = 'confermata' and (tg_op = 'INSERT' or old.stato <> 'confermata') then
    update specialists set stato_accesso = 'approvato', attivo = true, accesso_deciso_il = now()
     where id = new.specialist_id and stato_accesso = 'attesa';
  end if;
  return new;
end $$;
drop trigger if exists abilita_con_pacchetto on public.crediti_ore;
create trigger abilita_con_pacchetto after insert or update of stato on public.crediti_ore
  for each row execute function public.abilita_con_pacchetto();

-- Le società non compaiono tra i medici di sito e monitor
create or replace view public.medici_attivi as
select id, nome_visualizzato as medico, ruolo, area from public.specialists
where attivo and stato_accesso = 'approvato' and not coalesce(is_titolare, false) and tipo_soggetto = 'specialista';
grant select on public.medici_attivi to anon, authenticated;
