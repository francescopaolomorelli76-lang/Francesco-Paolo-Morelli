-- =====================================================================
-- CLINIA APP · Migrazione 023: pagamenti e fatture di Clinia, entrate, chiusure delle stanze, registro attività (27/11/2026).
--   · Clinia scrive; FPM legge tutto (vista di sola consultazione) e vede il registro di ogni operazione
--   · la numerazione delle fatture la dà il server, così due dispositivi non creano lo stesso numero
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
create table if not exists public.pagamenti_dottori (
  id             uuid primary key default gen_random_uuid(),
  specialist_id  text not null references public.specialists(id),
  descrizione    text not null,
  imponibile     numeric(10,2) not null check (imponibile > 0),
  aliquota_iva   numeric(4,2) not null default 0.22,
  totale         numeric(10,2) not null,
  giorno         date not null default current_date,
  metodo         text not null,
  anno           int not null default extract(year from current_date),
  numero         int,
  creato_da      uuid default auth.uid(),
  creato_il      timestamptz not null default now(),
  unique (anno, numero)
);
create or replace function public.numera_fattura() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.anno := extract(year from new.giorno);
  perform pg_advisory_xact_lock(hashtext('fatture-clinia-' || new.anno));
  select coalesce(max(numero), 0) + 1 into new.numero from pagamenti_dottori where anno = new.anno;
  new.totale := round(new.imponibile * (1 + new.aliquota_iva), 2);
  return new;
end $$;
drop trigger if exists numera_fattura on public.pagamenti_dottori;
create trigger numera_fattura before insert on public.pagamenti_dottori for each row execute function public.numera_fattura();

create table if not exists public.entrate_clinia (
  id uuid primary key default gen_random_uuid(), giorno date not null, descrizione text not null, categoria text not null,
  importo numeric(10,2) not null check (importo > 0), creato_da uuid default auth.uid(), creato_il timestamptz not null default now());

create table if not exists public.chiusure_stanze (
  room_id text not null references public.rooms(id) on delete cascade, giorno date not null, motivo text,
  creato_da uuid default auth.uid(), primary key (room_id, giorno));

create table if not exists public.registro_attivita (
  id bigserial primary key, quando timestamptz not null default now(), chi text not null, azione text not null, dettaglio text,
  utente uuid default auth.uid());

alter table public.pagamenti_dottori enable row level security;
alter table public.entrate_clinia enable row level security;
alter table public.chiusure_stanze enable row level security;
alter table public.registro_attivita enable row level security;
do $$ declare t text; begin
  foreach t in array array['pagamenti_dottori','entrate_clinia','chiusure_stanze'] loop
    execute format('drop policy if exists %1$s_leggi on public.%1$s', t);
    execute format('drop policy if exists %1$s_scrivi on public.%1$s', t);
    execute format('create policy %1$s_leggi on public.%1$s for select using (public.sono_titolare() or public.sono_admin())', t);
    execute format('create policy %1$s_scrivi on public.%1$s for all using (public.sono_titolare()) with check (public.sono_titolare())', t);
  end loop;
end $$;
-- i dottori vedono le chiusure (per non prenotare uno studio chiuso) e le proprie fatture
drop policy if exists chiusure_tutti on public.chiusure_stanze;
create policy chiusure_tutti on public.chiusure_stanze for select using (auth.uid() is not null);
drop policy if exists pagamenti_dottore on public.pagamenti_dottori;
create policy pagamenti_dottore on public.pagamenti_dottori for select
  using (exists (select 1 from public.specialists s where s.id = specialist_id and s.user_id = auth.uid()));
drop policy if exists registro_scrivi on public.registro_attivita;
drop policy if exists registro_leggi on public.registro_attivita;
create policy registro_scrivi on public.registro_attivita for insert with check (auth.uid() is not null);
create policy registro_leggi on public.registro_attivita for select using (public.sono_admin());

-- Un dottore non prenota uno studio chiuso
create or replace function public.studio_non_chiuso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from chiusure_stanze where room_id = new.room_id and giorno = new.giorno) then
    raise exception 'Lo studio è chiuso in questa data' using errcode = '23514'; end if;
  return new;
end $$;
drop trigger if exists studio_non_chiuso on public.room_bookings;
create trigger studio_non_chiuso before insert on public.room_bookings for each row execute function public.studio_non_chiuso();
