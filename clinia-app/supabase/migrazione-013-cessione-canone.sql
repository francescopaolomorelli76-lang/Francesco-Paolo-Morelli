-- =====================================================================
-- CLINIA APP · Migrazione 013: nuovo accordo FPM–Clinia (12/11/2026).
--   · niente più servizio di prenotazione a carico di pazienti e specialisti (0 €)
--   · Clinia versa a FPM un canone tecnologico di 9 € netti per ogni ora di studio prenotata
--     (manutenzione, gestione tecnologica, beneficenza: FPM dona il 3 % a Progetto Arca)
--   · software acquistato da Clinia: 12 rate da 300 € netti oppure 3.000 € netti in unica soluzione;
--     al saldo la proprietà passa a Clinia Srl; abbonamenti e canone restano a FPM a tempo indeterminato
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
update public.app_settings set valore = valore || '{"importo":0,"importi_ammessi":[0]}'::jsonb, aggiornato_il = now()
where chiave = 'servizio_app';
update public.app_settings set valore = '{"importo":0}'::jsonb, aggiornato_il = now() where chiave = 'servizio_agenda';
create or replace function public.servizio_agenda_importo() returns numeric
language sql stable security definer set search_path = public as $$ select 0::numeric $$;

insert into public.app_settings (chiave, valore) values ('canone_tecnologico',
  '{"euro_ora_netti":9,"a_carico":"clinia","base":"ore di studio prenotate e confermate","arca_pct":0.03,"durata":"tempo indeterminato"}')
on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now();

update public.app_settings set valore = valore || '{"tipo":"cessione","rate":12,"netto_rata":300,"unica_soluzione_netto":3000,"proprieta_al_saldo":"Clinia Srl"}'::jsonb, aggiornato_il = now()
where chiave = 'licenza';

-- Ore di studio del mese per il canone tecnologico (prenotazioni confermate)
create or replace function public.canone_mese(p_mese date)
returns table (ore numeric, canone numeric, arca numeric)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(extract(epoch from (fine - inizio)) / 3600), 0)::numeric(10,2),
         coalesce(sum(extract(epoch from (fine - inizio)) / 3600), 0)::numeric(10,2) * 9,
         round(coalesce(sum(extract(epoch from (fine - inizio)) / 3600), 0)::numeric * 9 * 0.03, 2)
  from public.room_bookings
  where stato = 'confermata' and giorno >= date_trunc('month', p_mese) and giorno < date_trunc('month', p_mese) + interval '1 month'
$$;
revoke all on function public.canone_mese(date) from public, anon;
grant execute on function public.canone_mese(date) to authenticated;
