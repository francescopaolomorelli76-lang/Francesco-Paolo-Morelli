-- =====================================================================
-- CLINIA APP · Migrazione 018: solo i dottori davvero in Clinia (24/11/2026).
--   · chi si registra come dottore resta "in attesa" finché FPM non lo approva
--   · FPM può rimuovere un dottore: sparisce da app, monitor e sito, le visite future si annullano
--   · Marco (titolare) non compare tra gli specialisti
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
alter table public.specialists add column if not exists stato_accesso text not null default 'attesa'
  check (stato_accesso in ('attesa','approvato','rifiutato','rimosso'));
alter table public.specialists add column if not exists accesso_deciso_il timestamptz;

-- I dottori già in elenco restano visibili ai pazienti; chi collega il proprio account passa comunque da FPM
update public.specialists set stato_accesso = 'approvato' where user_id is null and attivo and not coalesce(is_titolare,false);
update public.specialists set stato_accesso = 'approvato' where coalesce(is_titolare,false);
insert into public.specialists (id, nome_visualizzato, titolo, ruolo, area, bio, attivo, stato_accesso, professione, specializzazioni)
values ('maria-paola-simeone','Dott.ssa Maria Paola Simeone','Dott.ssa','Ginecologa · Sessuologa · Chirurga','chirurgia',
  '{"Medico chirurgo, specialista in Ginecologia e Ostetricia","Sessuologia clinica","Chirurgia ginecologica"}', true, 'approvato','Medico chirurgo','{"Ginecologia e ostetricia","Sessuologia","Chirurgia ginecologica"}')
on conflict (id) do nothing;
update public.specialists set nome_visualizzato = 'Dott. Angelo Costantiello', ruolo = 'Tecnico ortopedico' where id = 'angelo-costantiello';

-- Solo FPM cambia lo stato di accesso; un nuovo collegamento di un account riporta il dottore "in attesa"
create or replace function public.accesso_dottore() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.sono_admin() then
    if tg_op = 'UPDATE' and new.stato_accesso is distinct from old.stato_accesso then
      new.accesso_deciso_il := now();
      new.attivo := new.stato_accesso = 'approvato';
    end if;
    return new;
  end if;
  if new.is_titolare then return new; end if;
  if tg_op = 'INSERT' then
    new.stato_accesso := 'attesa'; new.attivo := false;
  elsif new.user_id is distinct from old.user_id and new.user_id is not null then
    new.stato_accesso := 'attesa'; new.attivo := false;
  else
    new.stato_accesso := old.stato_accesso; new.attivo := old.attivo; new.accesso_deciso_il := old.accesso_deciso_il;
  end if;
  return new;
end $$;
drop trigger if exists accesso_dottore on public.specialists;
create trigger accesso_dottore before insert or update on public.specialists
  for each row execute function public.accesso_dottore();

create or replace function public.notifiche_accesso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stato_accesso = 'attesa' and (tg_op = 'INSERT' or old.stato_accesso <> 'attesa' or new.user_id is distinct from old.user_id) then
    perform notifica_fpm('accesso', 'Dottore da approvare', new.nome_visualizzato || ' chiede di entrare in Clinia App.');
  elsif tg_op = 'UPDATE' and new.stato_accesso = 'approvato' and old.stato_accesso <> 'approvato' then
    insert into notifiche (per_specialista, tipo, titolo, testo) values (new.id, 'accesso', 'Accesso confermato',
      'Benvenuto in Clinia App: ora puoi prenotare gli studi e ricevere i pazienti.');
    insert into notifiche (per_ruolo, tipo, titolo, testo) values ('titolare', 'accesso', 'Nuovo dottore attivo', new.nome_visualizzato || ' è operativo.');
  elsif tg_op = 'UPDATE' and new.stato_accesso = 'rimosso' and old.stato_accesso <> 'rimosso' then
    update appointments set stato = 'annullata' where specialist_id = new.id and giorno >= current_date and stato in ('richiesta','confermata','in_attesa_pagamento');
    update room_bookings set stato = 'annullata' where specialist_id = new.id and giorno >= current_date and stato = 'confermata';
    update specialists set pubblicazione = '{"monitor":false,"sito":false,"instagram":false,"facebook":false}' where id = new.id;
    insert into notifiche (per_ruolo, tipo, titolo, testo) values ('titolare', 'accesso', 'Dottore rimosso', new.nome_visualizzato || ' non è più in Clinia App.');
  end if;
  return new;
end $$;
drop trigger if exists notifiche_accesso on public.specialists;
create trigger notifiche_accesso after insert or update of stato_accesso, user_id on public.specialists
  for each row execute function public.notifiche_accesso();

-- Un dottore non approvato non prenota studi
create or replace function public.studio_solo_approvati() returns trigger
language plpgsql security definer set search_path = public as $$
declare st text; tit boolean;
begin
  select stato_accesso, coalesce(is_titolare,false) into st, tit from specialists where id = new.specialist_id;
  if not tit and st <> 'approvato' then raise exception 'Profilo non ancora approvato da Clinia' using errcode = '42501'; end if;
  return new;
end $$;
drop trigger if exists studio_solo_approvati on public.room_bookings;
create trigger studio_solo_approvati before insert on public.room_bookings
  for each row execute function public.studio_solo_approvati();


-- Elenco pubblico per sito e monitor: solo dottori attivi, mai il titolare
create or replace view public.medici_attivi as
select id, nome_visualizzato as medico, ruolo, area from public.specialists
where attivo and stato_accesso = 'approvato' and not coalesce(is_titolare, false);
grant select on public.medici_attivi to anon, authenticated;

create or replace view public.calendario_pubblico as
select b.specialist_id, s.nome_visualizzato as medico, b.giorno, b.inizio, b.fine, r.nome as studio
from public.room_bookings b
join public.specialists s on s.id = b.specialist_id
left join public.rooms r on r.id = b.room_id
where b.stato = 'confermata' and b.giorno between current_date and current_date + 21
  and s.attivo and s.stato_accesso = 'approvato' and not coalesce(s.is_titolare, false)
  and s.consenso_pubblicazione and coalesce((s.pubblicazione->>'sito')::boolean, false);
grant select on public.calendario_pubblico to anon, authenticated;
