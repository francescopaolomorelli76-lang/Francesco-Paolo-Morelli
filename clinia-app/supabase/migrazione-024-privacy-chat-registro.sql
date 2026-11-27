-- =====================================================================
-- CLINIA APP · Migrazione 024 (27/11/2026) — DA APPLICARE SOLO DOPO L'OK DI FPM
--   · Modulo 09: FPM (admin) non legge più le conversazioni con i pazienti ("user:…")
--     se non ne fa parte. Vede le chat di lavoro (dottori, enti, Clinia).
--   · Modulo 01/23: tariffa salvata nel pacchetto e registro compensi solo in aggiunta.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
create or replace function public.chat_con_paziente(a text, b text) returns boolean
language sql immutable as $$ select a like 'user:%' or b like 'user:%' $$;

drop policy if exists chat_vedi on public.chat;
create policy chat_vedi on public.chat for select using (
  parte_a = any(public.mie_parti()) or parte_b = any(public.mie_parti())
  or (public.sono_admin() and not public.chat_con_paziente(parte_a, parte_b)));

drop policy if exists chat_msg_vedi on public.chat_messaggi;
create policy chat_msg_vedi on public.chat_messaggi for select using (exists (select 1 from public.chat c where c.id = chat_id
  and (c.parte_a = any(public.mie_parti()) or c.parte_b = any(public.mie_parti())
       or (public.sono_admin() and not public.chat_con_paziente(c.parte_a, c.parte_b)))));

drop policy if exists chat_msg_scrivi on public.chat_messaggi;
create policy chat_msg_scrivi on public.chat_messaggi for insert with check (mittente = any(public.mie_parti()) and exists (select 1 from public.chat c where c.id = chat_id
  and (c.parte_a = any(public.mie_parti()) or c.parte_b = any(public.mie_parti())
       or (public.sono_admin() and not public.chat_con_paziente(c.parte_a, c.parte_b)))));

-- Tariffa bloccata nel pacchetto: se in futuro cambia, i pacchetti passati restano com'erano
alter table public.crediti_ore add column if not exists tariffa numeric(8,2);
update public.crediti_ore set tariffa = 1.50 where tariffa is null;
alter table public.crediti_ore alter column tariffa set default 1.50;
alter table public.crediti_ore add column if not exists chiuso boolean not null default false;

-- Registro compensi FPM: si può solo aggiungere (niente modifiche, niente cancellazioni)
create table if not exists public.registro_compensi (
  id uuid primary key default gen_random_uuid(),
  credito_id uuid,
  specialist_id text,
  tipo text not null check (tipo in ('compenso','storno','rettifica')),
  ore numeric(8,2) not null,
  tariffa numeric(8,2) not null,
  importo numeric(10,2) not null,
  motivo text,
  creato_il timestamptz not null default now()
);
alter table public.registro_compensi enable row level security;
drop policy if exists rc_vedi on public.registro_compensi;
drop policy if exists rc_aggiungi on public.registro_compensi;
create policy rc_vedi on public.registro_compensi for select using (public.sono_admin() or public.sono_titolare());
create policy rc_aggiungi on public.registro_compensi for insert with check (public.sono_admin() or public.sono_titolare());
-- nessuna policy di update/delete: le righe non si toccano più
