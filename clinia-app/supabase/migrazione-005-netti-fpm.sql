-- =====================================================================
-- CLINIA APP · Migrazione 005: importi NETTI garantiti a FPM.
--   servizio di prenotazione 9 € netti · abbonamento specialista 50 € netti · licenza 300 € netti (12 mesi)
-- Pazienti e specialisti pagano 9 € e 50 €; la ritenuta d'acconto sopra questi importi
-- è a carico di Clinia, che la versa con F24 (lordo fiscale = netto / 0,85).
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
update public.app_settings set valore = valore || '{"importo":9,"importi_ammessi":[9],"netto_fpm":true}'::jsonb, aggiornato_il = now()
 where chiave = 'servizio_app';
insert into public.app_settings (chiave, valore) values ('abbonamento_specialista', '{"importo":50,"netto_fpm":true}')
on conflict (chiave) do update set valore = public.app_settings.valore || '{"importo":50,"netto_fpm":true}'::jsonb, aggiornato_il = now();
update public.app_settings set valore = (valore - 'mensile' - 'royalty_pct') || '{"netto":300}'::jsonb, aggiornato_il = now()
 where chiave = 'licenza';
update public.subscriptions set prezzo_mensile = 50 where piano = 'specialista' and stato in ('in_attesa','attivo');
