-- =====================================================================
-- CLINIA APP · Schema del database Supabase (PostgreSQL)
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
--
-- Come si usa: Supabase › SQL Editor › incolla questo file › Run.
-- Poi esegui seed.sql per studi, tariffe, specialisti e prestazioni.
--
-- Flussi economici gestiti:
--   paziente     → specialista : prezzo della visita (carta nell'app o in struttura)
--   paziente     → app (FPM)   : 7 € di servizio per ogni prenotazione pagata con carta
--   specialista  → app (FPM)   : 7 € per ogni visita pagata in struttura (addebito sulla carta dell'abbonamento)
--   specialista  → app (FPM)   : abbonamento mensile 49,90 €
--   specialista  → clinica     : affitto degli studi, pagato alla prenotazione
--   clinica      → app (FPM)   : abbonamento mensile 300 €
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Ruoli e profili
-- ---------------------------------------------------------------------
do $$ begin
  create type public.ruolo_utente as enum ('paziente','specialista','titolare','admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  ruolo         public.ruolo_utente not null default 'paziente',
  nome          text,
  cognome       text,
  email         text,
  prefisso      text default '+39',
  telefono      text,
  data_nascita  date,
  foto_url      text,
  consenso_dati_sanitari text check (consenso_dati_sanitari in ('si','limitato')),
  consenso_statistiche   boolean,
  notifiche     boolean default true,
  created_at    timestamptz not null default now()
);

-- Il ruolo si legge da qui: le funzioni sono security definer per evitare ricorsioni nelle policy.
create or replace function public.mio_ruolo() returns public.ruolo_utente
language sql stable security definer set search_path = public as $$
  select ruolo from public.profiles where id = auth.uid()
$$;

create or replace function public.sono_titolare() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select ruolo = 'titolare' from public.profiles where id = auth.uid()), false)
$$;

-- Crea il profilo alla registrazione (il ruolo arriva dai metadati: paziente o specialista).
create or replace function public.nuovo_utente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome, cognome, ruolo)
  values (new.id, new.email,
          new.raw_user_meta_data->>'nome',
          new.raw_user_meta_data->>'cognome',
          case when new.raw_user_meta_data->>'ruolo' = 'specialista' then 'specialista'::public.ruolo_utente
               else 'paziente'::public.ruolo_utente end)  -- 'titolare' si assegna solo a mano dal pannello
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.nuovo_utente();

-- ---------------------------------------------------------------------
-- Studi e tariffario
-- ---------------------------------------------------------------------
create table if not exists public.rooms (
  id      text primary key,               -- s1 … s9
  nome    text not null,                  -- Studio 1 … Studio 9
  tipo    text not null check (tipo in ('standard','ampio','compatto')),
  attivo  boolean not null default true
);

create table if not exists public.room_tariffs (
  tipo       text primary key check (tipo in ('standard','ampio','compatto')),
  ora        numeric(8,2) not null,
  mezza      numeric(8,2) not null,      -- 4 ore
  giornata   numeric(8,2) not null,      -- 8 ore o più
  ufficiale  boolean not null default false
);

create table if not exists public.opening_hours (
  giorno_settimana smallint primary key check (giorno_settimana between 0 and 6), -- 0 = domenica
  apertura time,
  chiusura time
);

-- Costo di un turno secondo il tariffario (stessa regola dell'app).
create or replace function public.costo_studio(p_room text, p_inizio time, p_fine time) returns numeric
language sql stable set search_path = public as $$
  with t as (select rt.* from public.rooms r join public.room_tariffs rt on rt.tipo = r.tipo where r.id = p_room),
       h as (select extract(epoch from (p_fine - p_inizio)) / 3600.0 as ore)
  select round(case
    when h.ore >= 8 then t.giornata
    when h.ore >= 4 then least(t.mezza + (h.ore - 4) * t.ora, t.giornata)
    else least(h.ore * t.ora, t.mezza) end, 2)
  from t, h
$$;

-- ---------------------------------------------------------------------
-- Specialisti (dati pubblici) e dati riservati
-- ---------------------------------------------------------------------
create table if not exists public.specialists (
  id             text primary key,                 -- es. marco-morelli
  user_id        uuid unique references auth.users(id) on delete set null,
  titolo         text,                             -- Dott., Dott.ssa, Prof.
  nome_visualizzato text not null,                 -- es. Dott. Marco Morelli
  ruolo          text not null,
  area           text not null check (area in ('chirurgia','medicina','riabilitazione')),
  bio            text[] not null default '{}',
  foto_url       text,
  cv_url         text,
  genere         char(1) check (genere in ('F','M')),
  visita_bambini boolean not null default false,
  sito           text,
  instagram      text,
  facebook       text,
  linkedin       text,
  valutazione    numeric(2,1),
  recensioni     int,
  is_titolare    boolean not null default false,
  attivo         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.specialist_private (
  specialist_id     text primary key references public.specialists(id) on delete cascade,
  email             text,
  telefono          text,
  pec               text,
  partita_iva       text check (partita_iva is null or partita_iva ~ '^[0-9]{11}$'),
  codice_fiscale    text check (codice_fiscale is null or codice_fiscale ~ '^[A-Z0-9]{16}$'),
  codice_sdi        text check (codice_sdi is null or codice_sdi ~ '^[A-Z0-9]{7}$'),
  iscrizione_albo   text,
  indirizzo_fatturazione text,
  regime_fiscale    text,                          -- ordinario, forfettario …
  stripe_account_id text,                          -- account Connect che riceve i pagamenti delle visite
  stripe_customer_id text,                         -- cliente che paga abbonamento e commissioni
  stripe_payment_method text,                      -- carta salvata per abbonamento e commissioni in contanti
  updated_at        timestamptz not null default now()
);

create or replace function public.mio_specialista() returns text
language sql stable security definer set search_path = public as $$
  select id from public.specialists where user_id = auth.uid()
$$;

create table if not exists public.services (
  id             bigserial primary key,
  specialist_id  text not null references public.specialists(id) on delete cascade,
  nome           text not null,
  durata_min     int not null check (durata_min between 5 and 480),
  prezzo         numeric(8,2) not null check (prezzo >= 0),
  online         boolean not null default false,
  attivo         boolean not null default true,
  ordine         int not null default 0
);
create index if not exists services_specialist on public.services(specialist_id);

-- ---------------------------------------------------------------------
-- Prenotazioni degli studi (lo specialista paga la clinica alla prenotazione)
-- ---------------------------------------------------------------------
create table if not exists public.room_bookings (
  id             uuid primary key default gen_random_uuid(),
  specialist_id  text not null references public.specialists(id),
  room_id        text not null references public.rooms(id),
  giorno         date not null,
  inizio         time not null,
  fine           time not null,
  stato          text not null default 'in_attesa_pagamento'
                 check (stato in ('in_attesa_pagamento','confermata','annullata')),
  importo        numeric(8,2) not null default 0,
  gratuito       boolean not null default false,   -- turni del titolare
  payment_id     uuid,
  turno_fisso    boolean not null default false,
  created_at     timestamptz not null default now(),
  periodo        tsrange generated always as (tsrange(giorno + inizio, giorno + fine)) stored,
  check (fine > inizio),
  -- Mai due prenotazioni sovrapposte nello stesso studio, né lo stesso specialista in due studi.
  constraint studio_libero exclude using gist (room_id with =, periodo with &&) where (stato <> 'annullata'),
  constraint specialista_libero exclude using gist (specialist_id with =, periodo with &&) where (stato <> 'annullata')
);
create index if not exists room_bookings_giorno on public.room_bookings(giorno);

-- Le prenotazioni in attesa di pagamento scadono dopo 15 minuti (eseguita dal cron).
create or replace function public.libera_studi_non_pagati() returns int
language sql security definer set search_path = public as $$
  with x as (update public.room_bookings set stato = 'annullata'
             where stato = 'in_attesa_pagamento' and created_at < now() - interval '15 minutes' returning 1)
  select count(*)::int from x
$$;

-- ---------------------------------------------------------------------
-- Familiari dei pazienti
-- ---------------------------------------------------------------------
create table if not exists public.family_members (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  cognome      text not null,
  data_nascita date not null,
  relazione    text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Visite
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  specialist_id         text not null references public.specialists(id),
  patient_id            uuid references auth.users(id) on delete set null,
  family_member_id      uuid references public.family_members(id) on delete set null,
  paziente_nome         text not null,
  service_id            bigint references public.services(id),
  prestazione           text not null,
  giorno                date not null,
  ora                   time not null,
  durata_min            int not null check (durata_min > 0),
  room_id               text references public.rooms(id),
  online                boolean not null default false,
  prezzo                numeric(8,2) not null check (prezzo >= 0),
  commissione_app       numeric(8,2) not null default 7.00,
  commissione_a_carico  text not null check (commissione_a_carico in ('paziente','specialista')),
  commissione_addebitata boolean not null default false,  -- per le visite in struttura: addebitata allo specialista
  metodo_pagamento      text not null check (metodo_pagamento in ('carta','struttura')),
  pagato                boolean not null default false,
  pagato_il             timestamptz,
  stato                 text not null default 'confermata' check (stato in ('in_attesa_pagamento','confermata','annullata','conclusa')),
  nota                  text,
  created_at            timestamptz not null default now(),
  periodo               tsrange generated always as
                        (tsrange(giorno + ora, giorno + ora + make_interval(mins => durata_min))) stored,
  constraint orario_libero exclude using gist (specialist_id with =, periodo with &&) where (stato not in ('annullata')),
  check ((metodo_pagamento = 'carta') = (commissione_a_carico = 'paziente'))
);
create index if not exists appointments_giorno on public.appointments(giorno);
create index if not exists appointments_patient on public.appointments(patient_id);

-- Orari occupati di uno specialista, senza nomi dei pazienti (per mostrare la disponibilità a tutti).
create or replace function public.orari_occupati(p_specialist text, p_dal date, p_al date)
returns table (giorno date, ora time, durata_min int)
language sql stable security definer set search_path = public as $$
  select giorno, ora, durata_min from public.appointments
  where specialist_id = p_specialist and giorno between p_dal and p_al and stato <> 'annullata'
$$;

-- ---------------------------------------------------------------------
-- Movimenti economici, abbonamenti, fatture
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null check (tipo in ('visita','commissione_app','affitto_studio',
                       'abbonamento_specialista','abbonamento_clinica','rimborso')),
  importo            numeric(10,2) not null,
  beneficiario       text not null check (beneficiario in ('app','clinica','specialista')),
  pagatore_user      uuid references auth.users(id) on delete set null,
  specialist_id      text references public.specialists(id),
  appointment_id     uuid references public.appointments(id),
  room_booking_ids   uuid[],
  metodo             text not null check (metodo in ('carta','struttura','addebito_mensile')),
  stato              text not null default 'in_attesa' check (stato in ('in_attesa','riuscito','fallito','rimborsato')),
  stripe_payment_intent text unique,
  stripe_invoice     text,
  competenza         date not null default current_date,
  created_at         timestamptz not null default now()
);
create index if not exists payments_specialist on public.payments(specialist_id, competenza);

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  piano                  text not null check (piano in ('specialista','clinica')),
  prezzo_mensile         numeric(8,2) not null,
  stato                  text not null default 'in_attesa' check (stato in ('in_attesa','attivo','disdetto','insoluto','scaduto')),
  inizio                 date,
  prossimo_rinnovo       date,
  stripe_subscription_id text unique,
  created_at             timestamptz not null default now()
);

create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  numero            text,
  emittente         text not null check (emittente in ('app','clinica','specialista')),
  destinatario_tipo text not null check (destinatario_tipo in ('paziente','specialista','clinica')),
  destinatario_user uuid references auth.users(id) on delete set null,
  specialist_id     text references public.specialists(id),
  payment_ids       uuid[] not null default '{}',
  imponibile        numeric(10,2) not null,
  iva               numeric(10,2) not null default 0,
  natura_iva        text,                -- es. N4 (esente art. 10 n.18), N2.2 (forfettario)
  bollo             numeric(6,2) not null default 0,
  totale            numeric(10,2) not null,
  canale            text not null check (canale in ('sdi','sistema_ts','pdf')),
  stato             text not null default 'bozza' check (stato in ('bozza','inviata','consegnata','scartata')),
  pdf_url           text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Documenti, messaggi, richieste
-- ---------------------------------------------------------------------
create table if not exists public.patient_files (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  nome             text not null,
  storage_path     text not null,
  dimensione       int,
  created_at       timestamptz not null default now()
);

create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  thread         text not null,              -- '<specialist_id>|<patient uuid>' o 'reception|<uuid>'
  mittente       uuid references auth.users(id) on delete set null,
  testo          text not null check (length(testo) between 1 and 4000),
  created_at     timestamptz not null default now()
);
create index if not exists messages_thread on public.messages(thread, created_at);

create table if not exists public.requests (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  tipo           text not null,
  destinatario   text not null,              -- 'reception' o id specialista
  testo          text,
  stato          text not null default 'inviata' check (stato in ('inviata','in_lavorazione','evasa')),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ricavi del mese per specialista (sezione "Ricavi" dell'app)
-- ---------------------------------------------------------------------
create or replace view public.ricavi_specialisti with (security_invoker = true) as
select a.specialist_id,
       date_trunc('month', a.giorno)::date                                          as mese,
       count(*)                                                                     as visite,
       coalesce(sum(a.prezzo) filter (where a.pagato and a.metodo_pagamento='carta'),0)     as incassato_carta,
       coalesce(sum(a.prezzo) filter (where a.pagato and a.metodo_pagamento='struttura'),0) as incassato_struttura,
       coalesce(sum(a.prezzo) filter (where not a.pagato),0)                         as da_incassare,
       coalesce(sum(a.commissione_app) filter (where a.commissione_a_carico='specialista'),0) as commissioni_a_carico
from public.appointments a
where a.stato <> 'annullata'
group by 1, 2;

-- ---------------------------------------------------------------------
-- Sicurezza: Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.rooms              enable row level security;
alter table public.room_tariffs       enable row level security;
alter table public.opening_hours      enable row level security;
alter table public.specialists        enable row level security;
alter table public.specialist_private enable row level security;
alter table public.services           enable row level security;
alter table public.room_bookings      enable row level security;
alter table public.family_members     enable row level security;
alter table public.appointments       enable row level security;
alter table public.payments           enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.invoices           enable row level security;
alter table public.patient_files      enable row level security;
alter table public.messages           enable row level security;
alter table public.requests           enable row level security;

-- Profili: ognuno il suo; il titolare li vede tutti.
drop policy if exists profili_lettura on public.profiles;
create policy profili_lettura on public.profiles for select using (id = auth.uid() or public.sono_titolare());
drop policy if exists profili_modifica on public.profiles;
create policy profili_modifica on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and ruolo = public.mio_ruolo());   -- nessuno può cambiarsi il ruolo

-- Dati pubblici: studi, tariffe, orari, specialisti, prestazioni.
drop policy if exists studi_pubblici on public.rooms;
create policy studi_pubblici on public.rooms for select using (true);
drop policy if exists tariffe_pubbliche on public.room_tariffs;
create policy tariffe_pubbliche on public.room_tariffs for select using (true);
drop policy if exists orari_pubblici on public.opening_hours;
create policy orari_pubblici on public.opening_hours for select using (true);
drop policy if exists specialisti_pubblici on public.specialists;
create policy specialisti_pubblici on public.specialists for select using (attivo or user_id = auth.uid() or public.sono_titolare());
drop policy if exists prestazioni_pubbliche on public.services;
create policy prestazioni_pubbliche on public.services for select using (true);
drop policy if exists titolare_tariffe on public.room_tariffs;
create policy titolare_tariffe on public.room_tariffs for all using (public.sono_titolare()) with check (public.sono_titolare());

-- Lo specialista modifica il proprio profilo pubblico e le proprie prestazioni.
drop policy if exists specialista_profilo on public.specialists;
create policy specialista_profilo on public.specialists for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists specialista_crea on public.specialists;
create policy specialista_crea on public.specialists for insert with check (user_id = auth.uid() and public.mio_ruolo() = 'specialista');
drop policy if exists specialista_prestazioni on public.services;
create policy specialista_prestazioni on public.services for all
  using (specialist_id = public.mio_specialista()) with check (specialist_id = public.mio_specialista());
drop policy if exists privati_proprietario on public.specialist_private;
create policy privati_proprietario on public.specialist_private for all
  using (specialist_id = public.mio_specialista()) with check (specialist_id = public.mio_specialista());
drop policy if exists privati_titolare on public.specialist_private;
create policy privati_titolare on public.specialist_private for select using (public.sono_titolare());

-- Studi: tutti gli utenti registrati vedono l'occupazione; lo specialista prenota per sé
-- (stato in attesa: diventa "confermata" solo dopo il pagamento, via webhook). Il titolare prenota gratis.
drop policy if exists studi_occupazione on public.room_bookings;
create policy studi_occupazione on public.room_bookings for select to authenticated using (true);
drop policy if exists studi_prenota on public.room_bookings;
create policy studi_prenota on public.room_bookings for insert to authenticated with check (
  (specialist_id = public.mio_specialista() and stato = 'in_attesa_pagamento' and not gratuito)
  or (public.sono_titolare() and gratuito));
drop policy if exists studi_annulla on public.room_bookings;
create policy studi_annulla on public.room_bookings for update to authenticated
  using (specialist_id = public.mio_specialista() or public.sono_titolare())
  with check (specialist_id = public.mio_specialista() or public.sono_titolare());

-- Familiari: solo il proprietario.
drop policy if exists familiari on public.family_members;
create policy familiari on public.family_members for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Visite: il paziente vede e crea le proprie; lo specialista le sue; il titolare tutte.
drop policy if exists visite_lettura on public.appointments;
create policy visite_lettura on public.appointments for select using (
  patient_id = auth.uid() or specialist_id = public.mio_specialista() or public.sono_titolare());
drop policy if exists visite_prenota on public.appointments;
create policy visite_prenota on public.appointments for insert to authenticated with check (
  patient_id = auth.uid() and pagato = false and commissione_app = 7.00 and commissione_addebitata = false
  and stato = case when metodo_pagamento = 'carta' then 'in_attesa_pagamento' else 'confermata' end);
drop policy if exists visite_aggiorna on public.appointments;
create policy visite_aggiorna on public.appointments for update to authenticated using (
  patient_id = auth.uid() or specialist_id = public.mio_specialista() or public.sono_titolare());

-- Movimenti, abbonamenti e fatture: si scrivono solo dal server (Edge Functions con service role).
drop policy if exists pagamenti_lettura on public.payments;
create policy pagamenti_lettura on public.payments for select using (
  pagatore_user = auth.uid() or specialist_id = public.mio_specialista()
  or (public.sono_titolare() and beneficiario = 'clinica'));
drop policy if exists abbonamenti_lettura on public.subscriptions;
create policy abbonamenti_lettura on public.subscriptions for select using (user_id = auth.uid());
drop policy if exists fatture_lettura on public.invoices;
create policy fatture_lettura on public.invoices for select using (
  destinatario_user = auth.uid() or specialist_id = public.mio_specialista()
  or (public.sono_titolare() and emittente = 'clinica'));

-- File, messaggi, richieste.
drop policy if exists file_proprietario on public.patient_files;
create policy file_proprietario on public.patient_files for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists messaggi_lettura on public.messages;
create policy messaggi_lettura on public.messages for select using (
  split_part(thread,'|',2) = auth.uid()::text
  or split_part(thread,'|',1) = public.mio_specialista()
  or (split_part(thread,'|',1) = 'reception' and public.sono_titolare()));
drop policy if exists messaggi_invio on public.messages;
create policy messaggi_invio on public.messages for insert to authenticated with check (
  mittente = auth.uid() and (
    split_part(thread,'|',2) = auth.uid()::text
    or split_part(thread,'|',1) = public.mio_specialista()
    or (split_part(thread,'|',1) = 'reception' and public.sono_titolare())));
drop policy if exists richieste on public.requests;
create policy richieste on public.requests for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists richieste_titolare on public.requests;
create policy richieste_titolare on public.requests for select using (public.sono_titolare());

-- Le visite con pagamento in struttura: lo specialista può solo segnarle pagate, non cambiarne il prezzo.
create or replace function public.blocca_campi_visita() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;              -- service role (server): tutto permesso
  if new.prezzo <> old.prezzo or new.commissione_app <> old.commissione_app
     or new.commissione_a_carico <> old.commissione_a_carico or new.specialist_id <> old.specialist_id
     or new.commissione_addebitata <> old.commissione_addebitata then
    raise exception 'Questi dati della visita non si possono modificare dall''app';
  end if;
  if new.pagato and not old.pagato then
    if new.metodo_pagamento = 'carta' then
      raise exception 'Le visite pagate con carta risultano pagate solo dopo la conferma del pagamento';
    end if;
    if old.specialist_id <> coalesce(public.mio_specialista(),'') and not public.sono_titolare() then
      raise exception 'Solo lo specialista può segnare la visita come pagata';
    end if;
    new.pagato_il := now();
  end if;
  if new.stato <> old.stato and new.stato not in ('annullata','conclusa') then
    raise exception 'Stato non consentito';
  end if;
  return new;
end $$;
drop trigger if exists visite_campi_protetti on public.appointments;
create trigger visite_campi_protetti before update on public.appointments
  for each row execute function public.blocca_campi_visita();

-- ---------------------------------------------------------------------
-- Tempo reale: prenotazioni di studi e visite si aggiornano su tutti i telefoni.
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.room_bookings, public.appointments, public.payments, public.messages;
  end if;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Archivio file (foto, curriculum, referti) – solo su Supabase.
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values
      ('foto-specialisti','foto-specialisti', true),
      ('curriculum','curriculum', false),
      ('referti','referti', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- Permessi sui file: ognuno nella propria cartella (<id specialista>/… oppure <uuid utente>/…).
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute $p$create policy "foto specialisti: caricamento" on storage.objects for insert to authenticated
      with check (bucket_id = 'foto-specialisti' and (storage.foldername(name))[1] = public.mio_specialista())$p$;
    execute $p$create policy "curriculum: proprietario" on storage.objects for all to authenticated
      using (bucket_id = 'curriculum' and ((storage.foldername(name))[1] = public.mio_specialista() or public.sono_titolare()))
      with check (bucket_id = 'curriculum' and (storage.foldername(name))[1] = public.mio_specialista())$p$;
    execute $p$create policy "referti: proprietario" on storage.objects for all to authenticated
      using (bucket_id = 'referti' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'referti' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
exception when duplicate_object then null; end $$;
