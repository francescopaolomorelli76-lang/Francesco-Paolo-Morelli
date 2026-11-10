-- =====================================================================
-- CLINIA APP · Migrazione 004: la donazione a Progetto Arca la fa FPM con bonifico.
-- FPM riceve la quota intera del servizio (al netto della sola ritenuta) e ogni mese bonifica
-- il 3 % del servizio a Fondazione Progetto Arca ETS. Pazienti, specialisti e Clinia
-- vedono nell'app la storia delle donazioni (solo totali mensili).
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
drop policy if exists donazioni_direzione on public.donazioni;
drop policy if exists donazioni_fpm on public.donazioni;
drop policy if exists donazioni_gestione_fpm on public.donazioni;
create policy donazioni_gestione_fpm on public.donazioni for all using (public.sono_admin()) with check (public.sono_admin());
alter table public.donazioni add column if not exists prenotazioni int not null default 0;
alter table public.donazioni add column if not exists ricevuta_path text;   -- bucket 'documenti-fpm'

-- Storia pubblica delle donazioni: solo totali per mese, per chiunque abbia un account
create or replace function public.arca_storia()
returns table (mese date, importo numeric, prenotazioni int, donata boolean, donata_il date)
language sql stable security definer set search_path = public as $$
  select mese, importo, prenotazioni, donata, donata_il from public.donazioni order by mese desc
$$;
revoke all on function public.arca_storia() from public, anon;
grant execute on function public.arca_storia() to authenticated;
