-- =====================================================================
-- CLINIA APP · Migrazione 010: agenda dello specialista dentro gli studi di Clinia.
--   · lo specialista può inserire da sé un appuntamento (paziente al telefono o di persona)
--   · ogni visita in sede deve stare DENTRO uno studio prenotato e confermato dallo specialista
--     (stessa stanza, stesso giorno, tra inizio e fine del turno): fuori da Clinia non si fissa nulla
--   · due visite nello stesso orario restano impossibili (vincolo orario_libero)
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
alter table public.appointments add column if not exists origine text not null default 'app'
  check (origine in ('app','agenda'));

-- Servizio di prenotazione sugli appuntamenti inseriti dallo specialista (0 = nessun addebito)
insert into public.app_settings (chiave, valore) values ('servizio_agenda', '{"importo":0}')
on conflict (chiave) do nothing;
create or replace function public.servizio_agenda_importo() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (valore->>'importo')::numeric from public.app_settings where chiave = 'servizio_agenda'), 0)
$$;

drop policy if exists visite_agenda on public.appointments;
create policy visite_agenda on public.appointments for insert to authenticated with check (
  origine = 'agenda' and specialist_id = public.mio_specialista() and patient_id is null
  and stato = 'confermata' and metodo_pagamento = 'struttura' and pagato = false
  and commissione_a_carico = 'specialista' and commissione_addebitata = false
  and commissione_app = public.servizio_agenda_importo());
-- le prenotazioni dei pazienti restano "app"
drop policy if exists visite_prenota on public.appointments;
create policy visite_prenota on public.appointments for insert to authenticated with check (
  origine = 'app' and patient_id = auth.uid() and pagato = false and commissione_addebitata = false
  and commissione_app = public.servizio_app_importo()
  and stato = case when metodo_pagamento = 'carta' then 'in_attesa_pagamento' else 'richiesta' end);

-- Ogni visita in sede dentro un turno confermato dello specialista
create or replace function public.visita_dentro_turno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.online or new.stato in ('annullata','rifiutata') then return new; end if;
  if tg_op = 'UPDATE' and new.giorno = old.giorno and new.ora = old.ora and new.durata_min = old.durata_min
     and new.room_id is not distinct from old.room_id then return new; end if;
  if new.room_id is null or not exists (
       select 1 from room_bookings rb
       where rb.specialist_id = new.specialist_id and rb.room_id = new.room_id and rb.giorno = new.giorno
         and rb.stato = 'confermata' and rb.inizio <= new.ora
         and rb.fine >= (new.ora + make_interval(mins => new.durata_min))::time) then
    raise exception 'Fuori dal turno: la visita va fissata in uno studio prenotato in Clinia (stanza, giorno e orario)'
      using errcode = 'P0001', hint = 'turno';
  end if;
  return new;
end $$;
drop trigger if exists visita_dentro_turno on public.appointments;
create trigger visita_dentro_turno before insert or update on public.appointments
  for each row execute function public.visita_dentro_turno();
