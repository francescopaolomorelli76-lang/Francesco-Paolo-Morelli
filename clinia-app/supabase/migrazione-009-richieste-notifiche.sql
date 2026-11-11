-- =====================================================================
-- CLINIA APP · Migrazione 009: richiesta di visita confermata dallo specialista e sezione Notifiche.
--   · il paziente prenota → la visita è una RICHIESTA → notifica allo specialista
--   · lo specialista conferma (o rifiuta) → notifica al paziente; a conferma, notifica a FPM
--   · lo specialista segna la visita come effettuata → notifica a FPM
--   · lo specialista prenota uno studio → notifica alla direzione di Clinia
-- FPM riceve solo iniziali del paziente, prestazione e specialista (mai dati sanitari).
-- Con la carta il pagamento viene solo AUTORIZZATO alla richiesta e addebitato alla conferma
-- (funzione visita-esito); se lo specialista rifiuta, l'autorizzazione viene annullata.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================

-- 1) Nuovi stati della visita
alter table public.appointments drop constraint if exists appointments_stato_check;
alter table public.appointments add constraint appointments_stato_check
  check (stato in ('in_attesa_pagamento','richiesta','confermata','rifiutata','annullata','conclusa'));
alter table public.appointments alter column stato set default 'richiesta';
alter table public.appointments add column if not exists stripe_payment_intent text;
alter table public.appointments add column if not exists confermata_il timestamptz;
alter table public.appointments add column if not exists effettuata_il timestamptz;
-- Una richiesta rifiutata libera l'orario
alter table public.appointments drop constraint if exists orario_libero;
alter table public.appointments add constraint orario_libero exclude using gist (specialist_id with =, periodo with &&)
  where (stato not in ('annullata','rifiutata'));

-- Il paziente crea una richiesta (in struttura) o una visita in attesa del pagamento (carta)
drop policy if exists visite_prenota on public.appointments;
create policy visite_prenota on public.appointments for insert to authenticated with check (
  patient_id = auth.uid() and pagato = false and commissione_addebitata = false
  and commissione_app = public.servizio_app_importo()
  and stato = case when metodo_pagamento = 'carta' then 'in_attesa_pagamento' else 'richiesta' end);

-- Chi può cambiare lo stato
create or replace function public.blocca_campi_visita() returns trigger
language plpgsql set search_path = public as $$
declare spec boolean := (old.specialist_id = coalesce(public.mio_specialista(),'') or public.sono_titolare());
begin
  if auth.uid() is null then                                   -- server (Edge Functions): tutto permesso
    if new.stato = 'confermata' and old.stato <> 'confermata' then new.confermata_il := now(); end if;
    if new.stato = 'conclusa' and old.stato <> 'conclusa' then new.effettuata_il := now(); end if;
    return new;
  end if;
  if new.prezzo <> old.prezzo or new.commissione_app <> old.commissione_app
     or new.commissione_a_carico <> old.commissione_a_carico or new.specialist_id <> old.specialist_id
     or new.commissione_addebitata <> old.commissione_addebitata
     or new.stripe_payment_intent is distinct from old.stripe_payment_intent then
    raise exception 'Questi dati della visita non si possono modificare dall''app';
  end if;
  if new.pagato and not old.pagato then
    if new.metodo_pagamento = 'carta' then
      raise exception 'Le visite pagate con carta risultano pagate solo dopo la conferma del pagamento';
    end if;
    if not spec then raise exception 'Solo lo specialista può segnare la visita come pagata'; end if;
    new.pagato_il := now();
  end if;
  if new.stato <> old.stato then
    if new.stato = 'annullata' then
      null;                                                     -- paziente o specialista possono annullare
    elsif new.stato in ('confermata','rifiutata') and old.stato = 'richiesta' and spec then
      if new.metodo_pagamento = 'carta' then
        raise exception 'Con la carta la conferma passa dalla funzione visita-esito (addebito o annullamento)';
      end if;
      if new.stato = 'confermata' then new.confermata_il := now(); end if;
    elsif new.stato = 'conclusa' and old.stato = 'confermata' and spec then
      new.effettuata_il := now();
    else
      raise exception 'Cambio di stato non consentito';
    end if;
  end if;
  return new;
end $$;

-- 2) Notifiche
create table if not exists public.notifiche (
  id              uuid primary key default gen_random_uuid(),
  creata_il       timestamptz not null default now(),
  per_user        uuid references auth.users(id) on delete cascade,        -- un paziente o un utente preciso
  per_specialista text references public.specialists(id) on delete cascade,
  per_ruolo       text check (per_ruolo in ('titolare','admin')),          -- direzione Clinia o FPM
  tipo            text not null,
  titolo          text not null,
  testo           text not null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  room_booking_id uuid references public.room_bookings(id) on delete set null,
  letta           boolean not null default false,
  check (num_nonnulls(per_user, per_specialista, per_ruolo) = 1)
);
create index if not exists notifiche_per_user on public.notifiche (per_user, creata_il desc);
create index if not exists notifiche_per_specialista on public.notifiche (per_specialista, creata_il desc);
create index if not exists notifiche_per_ruolo on public.notifiche (per_ruolo, creata_il desc);
alter table public.notifiche enable row level security;

create or replace function public.mia_notifica(n public.notifiche) returns boolean
language sql stable security definer set search_path = public as $$
  select n.per_user = auth.uid()
      or (n.per_specialista is not null and n.per_specialista = public.mio_specialista())
      or (n.per_ruolo = 'titolare' and public.sono_titolare())
      or (n.per_ruolo = 'admin' and public.sono_admin())
$$;
drop policy if exists notifiche_lettura on public.notifiche;
drop policy if exists notifiche_letta on public.notifiche;
create policy notifiche_lettura on public.notifiche for select using (public.mia_notifica(notifiche));
create policy notifiche_letta on public.notifiche for update using (public.mia_notifica(notifiche)) with check (public.mia_notifica(notifiche));
-- dall'app si cambia solo "letta"
create or replace function public.notifica_solo_letta() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (
       (to_jsonb(new) - 'letta' - 'appointment_id' - 'room_booking_id') <> (to_jsonb(old) - 'letta' - 'appointment_id' - 'room_booking_id')
       or (new.appointment_id is distinct from old.appointment_id and new.appointment_id is not null)
       or (new.room_booking_id is distinct from old.room_booking_id and new.room_booking_id is not null)) then
    raise exception 'Si può solo segnare la notifica come letta';
  end if;
  return new;
end $$;
drop trigger if exists notifica_solo_letta on public.notifiche;
create trigger notifica_solo_letta before update on public.notifiche for each row execute function public.notifica_solo_letta();

create or replace function public.iniziali(nome text) returns text language sql immutable as $$
  select coalesce(string_agg(upper(left(p, 1)) || '.', ' '), '') from unnest(string_to_array(trim(nome), ' ')) p where p <> ''
$$;
create or replace function public.quando(g date, o time) returns text language sql immutable as $$
  select to_char(g, 'DD/MM/YYYY') || ' alle ' || to_char(o, 'HH24:MI')
$$;

-- Visite: richiesta, conferma, rifiuto, visita effettuata
create or replace function public.notifiche_visita() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text; stud text;
begin
  select nome_visualizzato into sp from specialists where id = new.specialist_id;
  select nome into stud from rooms where id = new.room_id;
  if (tg_op = 'INSERT' and new.stato = 'richiesta') or (tg_op = 'UPDATE' and new.stato = 'richiesta' and old.stato = 'in_attesa_pagamento') then
    insert into notifiche (per_specialista, tipo, titolo, testo, appointment_id) values (new.specialist_id, 'richiesta_visita',
      'Nuova richiesta di visita', new.paziente_nome || ' · ' || new.prestazione || ' · ' || quando(new.giorno, new.ora)
      || coalesce(' · ' || stud, '') || '. Conferma o rifiuta dall''app.', new.id);
    if new.patient_id is not null then
      insert into notifiche (per_user, tipo, titolo, testo, appointment_id) values (new.patient_id, 'richiesta_inviata',
        'Richiesta inviata', 'La tua richiesta per ' || new.prestazione || ' con ' || coalesce(sp, 'lo specialista') || ' del '
        || quando(new.giorno, new.ora) || ' è in attesa di conferma.', new.id);
    end if;
  elsif tg_op = 'UPDATE' and new.stato <> old.stato then
    if new.stato = 'confermata' then
      if new.patient_id is not null then
        insert into notifiche (per_user, tipo, titolo, testo, appointment_id) values (new.patient_id, 'visita_confermata',
          'Visita confermata', coalesce(sp, 'Lo specialista') || ' ha confermato ' || new.prestazione || ' del ' || quando(new.giorno, new.ora)
          || coalesce(' · ' || stud, '') || '.', new.id);
      end if;
      insert into notifiche (per_ruolo, tipo, titolo, testo, appointment_id) values ('admin', 'visita_confermata',
        'Richiesta di visita confermata', iniziali(new.paziente_nome) || ' · ' || new.prestazione || ' · ' || coalesce(sp, '')
        || ' · ' || quando(new.giorno, new.ora) || ' · servizio ' || to_char(new.commissione_app, 'FM990D00') || ' €', new.id);
    elsif new.stato = 'rifiutata' and new.patient_id is not null then
      insert into notifiche (per_user, tipo, titolo, testo, appointment_id) values (new.patient_id, 'visita_rifiutata',
        'Richiesta non accettata', coalesce(sp, 'Lo specialista') || ' non può riceverti il ' || quando(new.giorno, new.ora)
        || '. Nessun addebito: scegli un altro orario.', new.id);
    elsif new.stato = 'conclusa' then
      insert into notifiche (per_ruolo, tipo, titolo, testo, appointment_id) values ('admin', 'visita_effettuata',
        'Visita effettuata', iniziali(new.paziente_nome) || ' · ' || new.prestazione || ' · ' || coalesce(sp, '')
        || ' · ' || quando(new.giorno, new.ora), new.id);
    elsif new.stato = 'annullata' then
      insert into notifiche (per_specialista, tipo, titolo, testo, appointment_id) values (new.specialist_id, 'visita_annullata',
        'Visita annullata', new.paziente_nome || ' · ' || new.prestazione || ' · ' || quando(new.giorno, new.ora), new.id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists notifiche_visita on public.appointments;
create trigger notifiche_visita after insert or update of stato on public.appointments
  for each row execute function public.notifiche_visita();

-- Studi: lo specialista prenota e conferma → la direzione riceve la notifica
create or replace function public.notifiche_studio() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text; stud text; tit boolean;
begin
  select nome_visualizzato, coalesce(is_titolare, false) into sp, tit from specialists where id = new.specialist_id;
  if tit then return new; end if;                               -- le prenotazioni del titolare non si notificano a se stesso
  select nome into stud from rooms where id = new.room_id;
  if new.stato = 'confermata' and (tg_op = 'INSERT' or old.stato <> 'confermata') then
    insert into notifiche (per_ruolo, tipo, titolo, testo, room_booking_id) values ('titolare', 'studio_prenotato',
      'Studio prenotato', coalesce(sp, 'Uno specialista') || ' · ' || coalesce(stud, new.room_id) || ' · '
      || to_char(new.giorno, 'DD/MM/YYYY') || ' ' || to_char(new.inizio, 'HH24:MI') || '–' || to_char(new.fine, 'HH24:MI'), new.id);
  elsif tg_op = 'UPDATE' and new.stato = 'annullata' and old.stato = 'confermata' then
    insert into notifiche (per_ruolo, tipo, titolo, testo, room_booking_id) values ('titolare', 'studio_annullato',
      'Prenotazione studio annullata', coalesce(sp, 'Uno specialista') || ' · ' || coalesce(stud, new.room_id) || ' · '
      || to_char(new.giorno, 'DD/MM/YYYY') || ' ' || to_char(new.inizio, 'HH24:MI') || '–' || to_char(new.fine, 'HH24:MI'), new.id);
  end if;
  return new;
end $$;
drop trigger if exists notifiche_studio on public.room_bookings;
create trigger notifiche_studio after insert or update of stato on public.room_bookings
  for each row execute function public.notifiche_studio();

-- Tempo reale: le notifiche arrivano subito sui telefoni
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifiche') then
    alter publication supabase_realtime add table public.notifiche;
  end if;
end $$;
