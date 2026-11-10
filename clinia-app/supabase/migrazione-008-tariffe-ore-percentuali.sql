-- =====================================================================
-- CLINIA APP · Migrazione 008: uso degli studi a ore, pacchetti prepagati e lavoro a percentuale.
-- Risposte della direzione (10/11/2026), tutti i prezzi IVA esclusa (+22 %):
--   una tantum 40 € l'ora; pacchetti prepagati 10 h a 35 €/h, 20 h a 30, 30 h a 25, 40 h a 20, 50 h a 15;
--   a percentuale: Studio 1 con ecografo 50 %, Studio 3 con Tecar 30 % della prestazione, altri studi da concordare.
-- Lo specialista fattura al paziente; Clinia fattura allo specialista l'utilizzo dello studio.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
insert into public.app_settings (chiave, valore) values ('tariffe_studi_ore',
  '{"iva_esclusa":true,"iva":0.22,"ora":40,"pacchetti":[{"ore":10,"euro_ora":35},{"ore":20,"euro_ora":30},{"ore":30,"euro_ora":25},{"ore":40,"euro_ora":20},{"ore":50,"euro_ora":15}]}')
on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now();

insert into public.app_settings (chiave, valore) values ('percentuali_utilizzo',
  '{"iva_esclusa":true,"s1":{"attrezzatura":"ecografo","percentuale":0.5},"s3":{"attrezzatura":"tecar","percentuale":0.3},"altri_studi":null}')
on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now();

update public.app_settings set valore = valore || '{"telefono":"+39 3929948545","telefono_secondario_in_dismissione":"+39 3293975297"}'::jsonb, aggiornato_il = now()
where chiave = 'clinica';

-- Tariffa oraria unica (40 €) per tutte le tipologie; mezza e giornata restano solo come multipli per compatibilità
update public.room_tariffs set ora = 40, mezza = 160, giornata = 320, ufficiale = true;

-- Pacchetti ore acquistati dagli specialisti e ore usate
create table if not exists public.pacchetti_ore (
  id            uuid primary key default gen_random_uuid(),
  specialist_id text not null references public.specialists(id),
  ore           numeric(6,2) not null check (ore > 0),
  euro_ora      numeric(8,2) not null check (euro_ora >= 0),
  imponibile    numeric(10,2) not null,
  iva           numeric(10,2) not null,
  payment_id    text,
  acquistato_il timestamptz not null default now()
);
create table if not exists public.ore_usate (
  id              uuid primary key default gen_random_uuid(),
  specialist_id   text not null references public.specialists(id),
  room_booking_id uuid references public.room_bookings(id) on delete set null,
  ore             numeric(6,2) not null check (ore > 0),
  usate_il        timestamptz not null default now()
);
alter table public.pacchetti_ore enable row level security;
alter table public.ore_usate enable row level security;
drop policy if exists pacchetti_lettura on public.pacchetti_ore;
drop policy if exists ore_usate_lettura on public.ore_usate;
create policy pacchetti_lettura on public.pacchetti_ore for select using (public.sono_titolare() or specialist_id = public.mio_specialista());
create policy ore_usate_lettura on public.ore_usate for select using (public.sono_titolare() or specialist_id = public.mio_specialista());
-- Scritture solo dalle funzioni del server (dopo il pagamento Stripe) o dalla direzione
drop policy if exists pacchetti_direzione on public.pacchetti_ore;
drop policy if exists ore_usate_direzione on public.ore_usate;
create policy pacchetti_direzione on public.pacchetti_ore for all using (public.sono_titolare()) with check (public.sono_titolare());
create policy ore_usate_direzione on public.ore_usate for all using (public.sono_titolare()) with check (public.sono_titolare());

-- Modalità di lavoro dello specialista: affitto dello studio o percentuale
alter table public.specialist_private add column if not exists modalita text not null default 'fitto' check (modalita in ('fitto','percentuale'));
