-- =====================================================================
-- CLINIA APP · Migrazione 015: FPM riceve una notifica per OGNI operazione dell'app.
--   · FPM (admin): richieste, conferme, rifiuti, disdette e visite effettuate; studi prenotati e annullati
--     con la royalty di 4,99 €/ora; pagamenti e incassi; nuovi pazienti e specialisti; abbonamenti
--     attivati/disdetti; accrediti reali a FPM (royalty, abbonamenti, rate); pagamenti di Clinia a FPM.
--   · Specialisti: richieste dei pazienti (009), disdette, incassi accreditati.
--   · Clinia (titolare): studi prenotati/annullati (009), quote realmente accreditate, nuovi specialisti,
--     conferma di ricezione dei pagamenti da parte di FPM.
--   Per FPM solo iniziali e importi, mai dati sanitari.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
create or replace function public.notifica_fpm(p_tipo text, p_titolo text, p_testo text,
  p_app uuid default null, p_room uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into notifiche (per_ruolo, tipo, titolo, testo, appointment_id, room_booking_id)
  values ('admin', p_tipo, p_titolo, p_testo, p_app, p_room)
$$;
revoke all on function public.notifica_fpm(text, text, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.euro(n numeric) returns text language sql immutable as $$
  select replace(to_char(coalesce(n, 0), 'FM9999990.00'), '.', ',') || ' €' $$;

-- Visite: FPM vede anche richieste, rifiuti e disdette (conferme ed effettuate sono già nella 009)
create or replace function public.notifiche_visita_fpm() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text;
begin
  select nome_visualizzato into sp from specialists where id = new.specialist_id;
  if (tg_op = 'INSERT' and new.stato = 'richiesta') or (tg_op = 'UPDATE' and new.stato = 'richiesta' and old.stato = 'in_attesa_pagamento') then
    perform notifica_fpm('richiesta_visita', 'Nuova richiesta di visita',
      iniziali(new.paziente_nome) || ' · ' || new.prestazione || ' · ' || coalesce(sp, '') || ' · ' || quando(new.giorno, new.ora), new.id);
  elsif tg_op = 'UPDATE' and new.stato <> old.stato and new.stato in ('rifiutata', 'annullata') then
    perform notifica_fpm(case when new.stato = 'rifiutata' then 'visita_rifiutata' else 'visita_annullata' end,
      case when new.stato = 'rifiutata' then 'Richiesta di visita rifiutata' else 'Visita disdetta' end,
      iniziali(new.paziente_nome) || ' · ' || new.prestazione || ' · ' || coalesce(sp, '') || ' · ' || quando(new.giorno, new.ora), new.id);
  end if;
  return new;
end $$;
drop trigger if exists notifiche_visita_fpm on public.appointments;
create trigger notifiche_visita_fpm after insert or update of stato on public.appointments
  for each row execute function public.notifiche_visita_fpm();

-- Studi: FPM riceve ogni prenotazione con le ore e la royalty maturata
create or replace function public.notifiche_studio_fpm() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text; stud text; ore numeric;
begin
  select nome_visualizzato into sp from specialists where id = new.specialist_id;
  select nome into stud from rooms where id = new.room_id;
  ore := round(extract(epoch from (new.fine - new.inizio)) / 3600, 2);
  if new.stato = 'confermata' and (tg_op = 'INSERT' or old.stato <> 'confermata') then
    perform notifica_fpm('royalty', 'Studio prenotato', coalesce(sp, 'Specialista') || ' · ' || coalesce(stud, new.room_id) || ' · '
      || to_char(new.giorno, 'DD/MM/YYYY') || ' · ' || replace(ore::text, '.', ',') || ' h × ' || euro(royalty_euro_ora())
      || ' = royalty ' || euro(round(ore * royalty_euro_ora(), 2)), null, new.id);
  elsif tg_op = 'UPDATE' and new.stato = 'annullata' and old.stato = 'confermata' then
    perform notifica_fpm('studio_annullato', 'Turno di studio annullato', coalesce(sp, 'Specialista') || ' · ' || coalesce(stud, new.room_id)
      || ' · ' || to_char(new.giorno, 'DD/MM/YYYY') || ': la royalty di quelle ore non è dovuta.', null, new.id);
  end if;
  return new;
end $$;
drop trigger if exists notifiche_studio_fpm on public.room_bookings;
create trigger notifiche_studio_fpm after insert or update of stato on public.room_bookings
  for each row execute function public.notifiche_studio_fpm();

-- Pagamenti riusciti: FPM li vede tutti; lo specialista riceve l'incasso della visita; Clinia le quote accreditate
create or replace function public.notifiche_pagamento() returns trigger
language plpgsql security definer set search_path = public as $$
declare sp text; voce text;
begin
  if new.stato <> 'riuscito' or (tg_op = 'UPDATE' and old.stato = 'riuscito') then return new; end if;
  select nome_visualizzato into sp from specialists where id = new.specialist_id;
  voce := case new.tipo when 'visita' then 'visita' when 'affitto_studio' then 'studio' when 'abbonamento_specialista' then 'abbonamento'
          when 'rimborso' then 'rimborso' else new.tipo end;
  perform notifica_fpm('pagamento', 'Pagamento incassato', euro(new.importo) || ' · ' || voce || coalesce(' · ' || sp, '')
    || ' · ' || case new.metodo when 'carta' then 'carta' when 'struttura' then 'in sede' else 'addebito mensile' end, new.appointment_id);
  if new.beneficiario = 'specialista' and new.specialist_id is not null then
    insert into notifiche (per_specialista, tipo, titolo, testo, appointment_id) values (new.specialist_id, 'incasso',
      'Incasso accreditato', euro(new.importo) || ' accreditati sul tuo conto.', new.appointment_id);
  elsif new.beneficiario = 'clinica' then
    insert into notifiche (per_ruolo, tipo, titolo, testo) values ('titolare', 'quota_accreditata',
      'Quota accreditata', euro(new.importo) || ' da ' || coalesce(sp, 'uno specialista') || ' (' || voce || ') accreditati sul conto di Clinia.');
  end if;
  return new;
end $$;
drop trigger if exists notifiche_pagamento on public.payments;
create trigger notifiche_pagamento after insert or update of stato on public.payments
  for each row execute function public.notifiche_pagamento();

-- Nuovi iscritti
create or replace function public.notifiche_profilo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ruolo::text = 'professionista' then
    perform notifica_fpm('registrazione', 'Nuovo specialista registrato', coalesce(iniziali(coalesce(new.nome, '') || ' ' || coalesce(new.cognome, '')), '') || ' · ' || to_char(now(), 'DD/MM/YYYY'));
    insert into notifiche (per_ruolo, tipo, titolo, testo) values ('titolare', 'registrazione', 'Nuovo specialista registrato',
      coalesce(new.nome || ' ' || new.cognome, 'Un nuovo specialista') || ' si è registrato nell''app.');
  elsif new.ruolo::text = 'paziente' then
    perform notifica_fpm('registrazione', 'Nuovo paziente registrato', coalesce(iniziali(coalesce(new.nome, '') || ' ' || coalesce(new.cognome, '')), '') || ' · ' || to_char(now(), 'DD/MM/YYYY'));
  end if;
  return new;
end $$;
drop trigger if exists notifiche_profilo on public.profiles;
create trigger notifiche_profilo after insert on public.profiles for each row execute function public.notifiche_profilo();

-- Abbonamenti
create or replace function public.notifiche_abbonamento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.stato = old.stato then return new; end if;
  if new.stato = 'attivo' then
    perform notifica_fpm('abbonamento', 'Abbonamento attivato', 'Piano ' || new.piano || ' · ' || euro(new.prezzo_mensile) || ' al mese');
  elsif new.stato in ('disdetto', 'insoluto', 'scaduto') then
    perform notifica_fpm('abbonamento_disdetto', 'Abbonamento ' || new.stato, 'Piano ' || new.piano || coalesce(' · fino al ' || to_char(new.prossimo_rinnovo, 'DD/MM/YYYY'), ''));
  end if;
  return new;
end $$;
drop trigger if exists notifiche_abbonamento on public.subscriptions;
create trigger notifiche_abbonamento after insert or update of stato on public.subscriptions
  for each row execute function public.notifiche_abbonamento();

-- Accrediti reali a FPM (royalty, abbonamenti, rate del software)
create or replace function public.notifiche_accredito_fpm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stato <> 'accreditato' or (tg_op = 'UPDATE' and old.stato = 'accreditato') then return new; end if;
  perform notifica_fpm('incasso', 'Accredito ricevuto', euro(new.netto) || ' netti · ' ||
    case new.tipo when 'royalty' then 'royalty ore di studio' when 'abbonamento' then 'royalty abbonamento' when 'licenza' then 'software' else new.tipo end
    || case when new.beneficenza > 0 then ' · da donare a Progetto Arca ' || euro(new.beneficenza) else '' end);
  return new;
end $$;
drop trigger if exists notifiche_accredito_fpm on public.fpm_transfers;
create trigger notifiche_accredito_fpm after insert or update of stato on public.fpm_transfers
  for each row execute function public.notifiche_accredito_fpm();

-- Pagamenti di Clinia a FPM (bonifico/contanti/automatico) e conferma di ricezione
create or replace function public.notifiche_pag_fpm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notifica_fpm('pagamento_fpm', 'Clinia ha pagato', to_char(new.mese, 'MM/YYYY') || ' · ' || new.voce || ' · ' || euro(new.importo_netto)
      || ' netti con ' || new.metodo || case when new.confermato_fpm then '' else '. Conferma la ricezione.' end);
  elsif new.confermato_fpm and not old.confermato_fpm then
    insert into notifiche (per_ruolo, tipo, titolo, testo) values ('titolare', 'ricezione_confermata', 'FPM ha ricevuto il pagamento',
      to_char(new.mese, 'MM/YYYY') || ' · ' || euro(new.importo_netto) || ' confermati da FPM.');
  end if;
  return new;
end $$;
drop trigger if exists notifiche_pag_fpm on public.fpm_pagamenti;
create trigger notifiche_pag_fpm after insert or update of confermato_fpm on public.fpm_pagamenti
  for each row execute function public.notifiche_pag_fpm();
