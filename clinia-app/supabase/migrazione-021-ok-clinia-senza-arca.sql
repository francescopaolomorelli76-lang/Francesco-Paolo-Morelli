-- =====================================================================
-- CLINIA APP · Migrazione 021: basta l'ok di Clinia; niente Progetto Arca (26/11/2026).
--   · Clinia registra e conferma il pacchetto (doppia conferma nell'app): è attivo subito
--   · FPM vede subito il compenso e può correggere o azzerare eventuali errori
--   · le ore scalano quando la prenotazione della stanza è confermata
--   · Progetto Arca tolto da notifiche e calcoli
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
drop policy if exists crediti_clinia on public.crediti_ore;
create policy crediti_clinia on public.crediti_ore for insert
  with check (public.sono_titolare() and inserito_da = 'clinia' and stato in ('richiesta','confermata'));

create or replace function public.notifiche_crediti() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text;
begin
  select nome_visualizzato into sp from specialists where id = new.specialist_id;
  if new.stato = 'confermata' and (tg_op = 'INSERT' or old.stato <> 'confermata') then
    if new.confermato_il is null then new.confermato_il := now(); end if;
    insert into notifiche (per_specialista, tipo, titolo, testo) values (new.specialist_id, 'ore', 'Ore attive',
      replace(new.ore::text, '.', ',') || ' h attive: scalano a ogni stanza che prenoti.');
    perform notifica_fpm('ore', 'Nuovo pacchetto attivo', coalesce(sp, '') || ': ' || replace(new.ore::text, '.', ',')
      || ' h → compenso ' || euro(round(new.ore * royalty_euro_ora(), 2)));
  end if;
  return new;
end $$;

create or replace function public.data_conferma_credito() returns trigger
language plpgsql as $$
begin
  if new.stato = 'confermata' and new.confermato_il is null then new.confermato_il := now(); end if;
  return new;
end $$;
drop trigger if exists data_conferma_credito on public.crediti_ore;
create trigger data_conferma_credito before insert or update of stato on public.crediti_ore
  for each row execute function public.data_conferma_credito();

create or replace function public.notifiche_accredito_fpm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stato <> 'accreditato' or (tg_op = 'UPDATE' and old.stato = 'accreditato') then return new; end if;
  perform notifica_fpm('incasso', 'Accredito ricevuto', euro(new.netto) || ' netti · ' ||
    case new.tipo when 'royalty' then 'compenso ore dei dottori' when 'licenza' then 'compenso fisso' else new.tipo end);
  return new;
end $$;
update public.app_settings set valore = valore || '{"arca_pct":0}'::jsonb where chiave = 'royalty_ore';
