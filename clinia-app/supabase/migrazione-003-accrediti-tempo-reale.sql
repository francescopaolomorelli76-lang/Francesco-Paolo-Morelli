-- =====================================================================
-- CLINIA APP · Migrazione 003: accrediti in tempo reale, Progetto Arca, licenza netta.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
--
-- Flussi (piattaforma Stripe = conto di Clinia, P.IVA della struttura):
--   visita con carta  → prezzo SUBITO allo specialista (conto collegato)
--   servizio 7 € / 9 € → 3 % a Progetto Arca (accantonato), resto a FPM al netto della ritenuta
--   abbonamento 49,90 → a FPM al netto della ritenuta
--   affitto stanze    → resta a Clinia
--   licenza           → giorno 1 di ogni mese, per 12 mesi: 300 € NETTI a FPM (Clinia versa la ritenuta con F24)
-- Rieseguibile.
-- =====================================================================

-- Conti per gli accrediti (l'IBAN completo lo custodisce Stripe: qui solo intestatario e ultime 4 cifre)
alter table public.specialist_private add column if not exists iban_intestatario text;
alter table public.specialist_private add column if not exists iban_ultime4      text check (iban_ultime4 is null or iban_ultime4 ~ '^[A-Z0-9]{4}$');
alter table public.specialist_private add column if not exists accrediti_attivi  boolean not null default false;

create table if not exists public.fpm_account (
  id                 int primary key default 1 check (id = 1),
  stripe_account_id  text,
  iban_intestatario  text,
  iban_ultime4       text,
  aggiornato_il      timestamptz not null default now()
);
alter table public.fpm_account enable row level security;
drop policy if exists conto_fpm on public.fpm_account;
create policy conto_fpm on public.fpm_account for all using (public.sono_admin()) with check (public.sono_admin());

-- Impostazioni economiche
insert into public.app_settings (chiave, valore) values
  ('licenza', '{"netto":300,"mesi":12,"inizio":"2026-11-01"}'),
  ('servizio_app', '{"importo":7,"importi_ammessi":[7,9],"beneficenza_pct":0.03,"beneficiario":"Fondazione Progetto Arca ETS","beneficiario_cf":"11183570156"}'),
  ('ritenuta_fpm', '{"aliquota":0.20,"quota_imponibile":0.75}')
on conflict (chiave) do update set valore = excluded.valore || public.app_settings.valore, aggiornato_il = now();  -- i valori già impostati restano
drop policy if exists impostazioni_fpm on public.app_settings;
create policy impostazioni_fpm on public.app_settings for update using (public.sono_admin() and chiave = 'servizio_app') with check (public.sono_admin() and chiave = 'servizio_app');

create or replace function public.servizio_app_importo() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (valore->>'importo')::numeric from public.app_settings where chiave = 'servizio_app'), 7)
$$;

-- Il paziente prenota con il servizio in vigore (7 € o 9 €)
drop policy if exists visite_prenota on public.appointments;
create policy visite_prenota on public.appointments for insert to authenticated with check (
  patient_id = auth.uid() and pagato = false and commissione_addebitata = false
  and commissione_app = public.servizio_app_importo()
  and stato = case when metodo_pagamento = 'carta' then 'in_attesa_pagamento' else 'confermata' end);
alter table public.appointments alter column commissione_app drop default;

-- Accrediti a FPM, uno per ogni operazione (scritti solo dal server)
create table if not exists public.fpm_transfers (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  tipo                text not null check (tipo in ('servizio_paziente','servizio_specialista','abbonamento','licenza')),
  appointment_id      uuid references public.appointments(id) on delete set null,
  specialist_id       text references public.specialists(id),
  lordo               numeric(10,2) not null,
  beneficenza         numeric(10,2) not null default 0,
  ritenuta            numeric(10,2) not null,
  netto               numeric(10,2) not null,
  stripe_transfer_id  text unique,
  stato               text not null default 'accreditato' check (stato in ('in_attesa','accreditato','fallito','stornato'))
);
create index if not exists fpm_transfers_data on public.fpm_transfers(created_at);
alter table public.fpm_transfers enable row level security;
drop policy if exists accrediti_fpm on public.fpm_transfers;
create policy accrediti_fpm on public.fpm_transfers for select using (public.sono_admin() or public.sono_titolare());

-- Donazioni mensili a Progetto Arca (3 % del servizio prenotazioni)
create table if not exists public.donazioni (
  mese         date primary key,
  importo      numeric(10,2) not null default 0,
  donata       boolean not null default false,
  donata_il    date,
  riferimento  text
);
alter table public.donazioni enable row level security;
drop policy if exists donazioni_direzione on public.donazioni;
create policy donazioni_direzione on public.donazioni for all using (public.sono_titolare()) with check (public.sono_titolare());
drop policy if exists donazioni_fpm on public.donazioni;
create policy donazioni_fpm on public.donazioni for select using (public.sono_admin());

-- Movimenti per l'area FPM: SOLO iniziali del paziente e servizio ricevuto (dato pseudonimizzato).
create or replace function public.fpm_movimenti(p_mese date)
returns table (quando timestamptz, tipo text, iniziali text, prestazione text, specialista text,
               lordo numeric, beneficenza numeric, ritenuta numeric, netto numeric)
language plpgsql stable security definer set search_path = public as $$
declare a timestamptz := date_trunc('month', p_mese); b timestamptz := date_trunc('month', p_mese) + interval '1 month';
begin
  if not (public.sono_admin() or public.sono_titolare()) then raise exception 'Accesso riservato'; end if;
  return query
    select t.created_at, t.tipo,
           (select string_agg(upper(left(w, 1)) || '.', '') from regexp_split_to_table(trim(ap.paziente_nome), '\s+') w where w <> ''),
           coalesce(ap.prestazione, case t.tipo when 'abbonamento' then 'Abbonamento specialista' when 'licenza' then 'Licenza Clinia App' end),
           s.nome_visualizzato, t.lordo, t.beneficenza, t.ritenuta, t.netto
    from public.fpm_transfers t
    left join public.appointments ap on ap.id = t.appointment_id
    left join public.specialists s on s.id = t.specialist_id
    where t.created_at >= a and t.created_at < b
    order by t.created_at desc;
end $$;
revoke all on function public.fpm_movimenti(date) from public, anon;
grant execute on function public.fpm_movimenti(date) to authenticated;

-- Numero di specialisti con abbonamento attivo (per l'area FPM)
create or replace function public.specialisti_abbonati() returns int
language sql stable security definer set search_path = public as $$
  select case when public.sono_admin() or public.sono_titolare()
    then (select count(*)::int from public.subscriptions where piano = 'specialista' and stato in ('attivo','disdetto')) end
$$;
grant execute on function public.specialisti_abbonati() to authenticated;

-- Tempo reale anche per gli accrediti
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.fpm_transfers;
  end if;
exception when duplicate_object then null; end $$;
