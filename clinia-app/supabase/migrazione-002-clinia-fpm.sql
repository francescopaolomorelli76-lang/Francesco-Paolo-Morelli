-- =====================================================================
-- CLINIA APP · Migrazione 002: modello economico "tutto a Clinia",
-- sezione Clinia (direzione) e sezione FPM (area riservata dell'autore).
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
--
-- Nuovo modello: pazienti, specialisti e affitti pagano Clinia (P.IVA della struttura).
-- Clinia gira agli specialisti le visite incassate con carta e paga all'autore del software
-- 300 €/mese per 12 mesi (licenza), poi una royalty concordata.
-- Ruoli: 'titolare' = direzione Clinia (Dott. Marco Morelli), 'admin' = FPM WebDesignTech.
-- Rieseguibile.
-- =====================================================================

-- La direzione (titolare) e FPM (admin) sono ruoli distinti: FPM non deve vedere i dati dei pazienti.
create or replace function public.sono_titolare() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select ruolo = 'titolare' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.sono_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select ruolo = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- Stanze: nome, tariffe e foto per singola stanza
-- ---------------------------------------------------------------------
alter table public.rooms add column if not exists tariffa_ora      numeric(8,2);
alter table public.rooms add column if not exists tariffa_mezza    numeric(8,2);
alter table public.rooms add column if not exists tariffa_giornata numeric(8,2);
alter table public.rooms add column if not exists foto             text[] not null default '{}';

create or replace function public.costo_studio(p_room text, p_inizio time, p_fine time) returns numeric
language sql stable set search_path = public as $$
  with t as (select coalesce(r.tariffa_ora, rt.ora) ora, coalesce(r.tariffa_mezza, rt.mezza) mezza,
                    coalesce(r.tariffa_giornata, rt.giornata) giornata
             from public.rooms r join public.room_tariffs rt on rt.tipo = r.tipo where r.id = p_room),
       h as (select extract(epoch from (p_fine - p_inizio)) / 3600.0 as ore)
  select round(case
    when h.ore >= 8 then t.giornata
    when h.ore >= 4 then least(t.mezza + (h.ore - 4) * t.ora, t.giornata)
    else least(h.ore * t.ora, t.mezza) end, 2)
  from t, h
$$;

drop policy if exists stanze_direzione on public.rooms;
create policy stanze_direzione on public.rooms for update using (public.sono_titolare()) with check (public.sono_titolare());

-- ---------------------------------------------------------------------
-- Movimenti: ora il beneficiario è sempre Clinia (la colonna resta per lo storico)
-- ---------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_tipo_check;
alter table public.payments add constraint payments_tipo_check check (tipo in
  ('visita','commissione_app','servizio_paziente','servizio_specialista','affitto_studio',
   'abbonamento_specialista','abbonamento_clinica','rimborso'));

-- Compensi che Clinia gira agli specialisti (visite pagate con carta)
create table if not exists public.specialist_payouts (
  specialist_id text not null references public.specialists(id),
  mese          date not null,                       -- primo giorno del mese
  importo       numeric(10,2) not null default 0,
  versato       boolean not null default false,
  versato_il    timestamptz,
  riferimento   text,                                -- CRO / note del bonifico
  primary key (specialist_id, mese)
);
alter table public.specialist_payouts enable row level security;
drop policy if exists compensi_direzione on public.specialist_payouts;
create policy compensi_direzione on public.specialist_payouts for all using (public.sono_titolare()) with check (public.sono_titolare());
drop policy if exists compensi_specialista on public.specialist_payouts;
create policy compensi_specialista on public.specialist_payouts for select using (specialist_id = public.mio_specialista());

-- ---------------------------------------------------------------------
-- Spese aggiuntive della clinica (micro rendiconto)
-- ---------------------------------------------------------------------
create table if not exists public.clinic_expenses (
  id             uuid primary key default gen_random_uuid(),
  giorno         date not null,
  descrizione    text not null,
  categoria      text not null,
  importo        numeric(10,2) not null check (importo > 0),
  allegato_path  text,                               -- bucket 'ricevute-clinica'
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);
alter table public.clinic_expenses enable row level security;
drop policy if exists spese_direzione on public.clinic_expenses;
create policy spese_direzione on public.clinic_expenses for all using (public.sono_titolare()) with check (public.sono_titolare());

-- ---------------------------------------------------------------------
-- Area FPM: impostazioni della licenza, ricevute dei compensi, documenti
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  chiave  text primary key,
  valore  jsonb not null,
  aggiornato_il timestamptz not null default now()
);
insert into public.app_settings (chiave, valore) values
  ('licenza', '{"mensile":300,"mesi":12,"inizio":"2026-11-01","royalty_pct":null}'),
  ('servizio_app', '{"importo":7}'),
  ('abbonamento_specialista', '{"importo":49.90}')
on conflict (chiave) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists impostazioni_lettura on public.app_settings;
create policy impostazioni_lettura on public.app_settings for select using (public.sono_titolare() or public.sono_admin());
drop policy if exists impostazioni_scrittura on public.app_settings;
create policy impostazioni_scrittura on public.app_settings for all using (public.sono_titolare()) with check (public.sono_titolare());

create table if not exists public.fpm_receipts (
  mese        date primary key,
  lordo       numeric(10,2) not null,
  imponibile  numeric(10,2) not null,
  ritenuta    numeric(10,2) not null,
  netto       numeric(10,2) not null,
  emessa      boolean not null default false,
  pagata      boolean not null default false,
  pagata_il   date,
  note        text
);
alter table public.fpm_receipts enable row level security;
drop policy if exists ricevute_fpm on public.fpm_receipts;
create policy ricevute_fpm on public.fpm_receipts for all using (public.sono_admin()) with check (public.sono_admin());
drop policy if exists ricevute_direzione on public.fpm_receipts;
create policy ricevute_direzione on public.fpm_receipts for select using (public.sono_titolare());

create table if not exists public.fpm_documents (
  id            uuid primary key default gen_random_uuid(),
  categoria     text not null,
  nome          text not null,
  storage_path  text not null,                       -- bucket 'documenti-fpm'
  anno          int not null default extract(year from now()),
  dimensione    int,
  created_at    timestamptz not null default now()
);
alter table public.fpm_documents enable row level security;
drop policy if exists documenti_fpm on public.fpm_documents;
create policy documenti_fpm on public.fpm_documents for all using (public.sono_admin()) with check (public.sono_admin());

-- ---------------------------------------------------------------------
-- Riepilogo mensile: SOLO TOTALI (nessun nome o dato sanitario).
-- Lo vedono la direzione e FPM; serve al rendiconto e al calcolo delle royalty.
-- ---------------------------------------------------------------------
create or replace function public.riepilogo_mese(p_mese date)
returns table (visite int, visite_carta int, visite_struttura int, incassato_carta numeric,
               servizio_pazienti numeric, servizio_specialisti numeric, abbonamenti numeric,
               affitti numeric, da_girare_specialisti numeric, spese numeric)
language plpgsql stable security definer set search_path = public as $$
declare a date := date_trunc('month', p_mese)::date; b date := (date_trunc('month', p_mese) + interval '1 month')::date;
begin
  if not (public.sono_titolare() or public.sono_admin()) then raise exception 'Accesso riservato'; end if;
  return query select
    (select count(*)::int from appointments where giorno >= a and giorno < b and stato <> 'annullata'),
    (select count(*)::int from appointments where giorno >= a and giorno < b and stato <> 'annullata' and metodo_pagamento = 'carta'),
    (select count(*)::int from appointments where giorno >= a and giorno < b and stato <> 'annullata' and metodo_pagamento = 'struttura'),
    (select coalesce(sum(prezzo),0) from appointments where giorno >= a and giorno < b and pagato and metodo_pagamento = 'carta'),
    (select coalesce(sum(commissione_app),0) from appointments where giorno >= a and giorno < b and pagato and commissione_a_carico = 'paziente'),
    (select coalesce(sum(commissione_app),0) from appointments where giorno >= a and giorno < b and commissione_addebitata and commissione_a_carico = 'specialista'),
    (select coalesce(sum(importo),0) from payments where tipo = 'abbonamento_specialista' and stato = 'riuscito' and competenza >= a and competenza < b),
    (select coalesce(sum(importo),0) from payments where tipo = 'affitto_studio' and stato = 'riuscito' and competenza >= a and competenza < b),
    (select coalesce(sum(ap.prezzo),0) from appointments ap join specialists s on s.id = ap.specialist_id
       where ap.giorno >= a and ap.giorno < b and ap.pagato and ap.metodo_pagamento = 'carta' and not s.is_titolare),
    (select coalesce(sum(importo),0) from clinic_expenses where giorno >= a and giorno < b);
end $$;
revoke all on function public.riepilogo_mese(date) from public, anon;
grant execute on function public.riepilogo_mese(date) to authenticated;

-- ---------------------------------------------------------------------
-- Archivi file
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values
      ('foto-stanze','foto-stanze', true),
      ('ricevute-clinica','ricevute-clinica', false),
      ('documenti-fpm','documenti-fpm', false)
    on conflict (id) do nothing;
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute $p$drop policy if exists "foto stanze: direzione" on storage.objects$p$;
    execute $p$create policy "foto stanze: direzione" on storage.objects for all to authenticated
      using (bucket_id = 'foto-stanze' and public.sono_titolare()) with check (bucket_id = 'foto-stanze' and public.sono_titolare())$p$;
    execute $p$drop policy if exists "ricevute clinica: direzione" on storage.objects$p$;
    execute $p$create policy "ricevute clinica: direzione" on storage.objects for all to authenticated
      using (bucket_id = 'ricevute-clinica' and public.sono_titolare()) with check (bucket_id = 'ricevute-clinica' and public.sono_titolare())$p$;
    execute $p$drop policy if exists "documenti fpm: solo fpm" on storage.objects$p$;
    execute $p$create policy "documenti fpm: solo fpm" on storage.objects for all to authenticated
      using (bucket_id = 'documenti-fpm' and public.sono_admin()) with check (bucket_id = 'documenti-fpm' and public.sono_admin())$p$;
  end if;
end $$;

-- FPM non vede mai i dati dei pazienti: nessuna policy su appointments, messages, patient_files
-- per il ruolo admin. Vede solo i totali tramite riepilogo_mese().
