-- =====================================================================
-- CLINIA APP · Migrazione 011: il servizio di prenotazione vale anche per gli appuntamenti scritti in Agenda.
-- Il paziente che telefona allo specialista paga il prezzo della visita più 9 € (es. 130 € → 139 €);
-- lo specialista incassa tutto in sede (contanti o POS) e l'app addebita i 9 € sulla sua carta la notte
-- dopo la visita (funzione commissioni-contanti), accreditandoli a FPM, che dona il 3 % a Progetto Arca.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
update public.app_settings set valore = jsonb_build_object('importo', public.servizio_app_importo(), 'uguale_al_servizio_app', true), aggiornato_il = now()
where chiave = 'servizio_agenda';
create or replace function public.servizio_agenda_importo() returns numeric
language sql stable security definer set search_path = public as $$
  select public.servizio_app_importo()
$$;
