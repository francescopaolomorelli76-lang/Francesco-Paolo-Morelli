-- =====================================================================
-- CLINIA APP · Migrazione 012: il Dott. Marco Morelli è il titolare della struttura, non uno specialista.
-- Il suo profilo da specialista non è più visibile ai pazienti né prenotabile; il ruolo di titolare resta.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
update public.specialists set attivo = false where id = 'marco-morelli';
