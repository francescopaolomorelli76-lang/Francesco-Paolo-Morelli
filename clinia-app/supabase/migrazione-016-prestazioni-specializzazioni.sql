-- =====================================================================
-- CLINIA APP · Migrazione 016: professione e specializzazioni dello specialista,
-- tipo di visita nelle prestazioni, stanza riservata per le visite online in videochiamata.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
alter table public.specialists add column if not exists professione text;
alter table public.specialists add column if not exists specializzazioni text[] not null default '{}';
alter table public.services add column if not exists tipo text;

-- Chiave casuale della videochiamata: la vedono solo paziente e specialista della visita (RLS di appointments)
alter table public.appointments add column if not exists video_key text;
create or replace function public.video_key_visita() returns trigger
language plpgsql as $$
begin
  if new.online and new.video_key is null then new.video_key := replace(gen_random_uuid()::text, '-', ''); end if;
  return new;
end $$;
drop trigger if exists video_key_visita on public.appointments;
create trigger video_key_visita before insert or update of online on public.appointments
  for each row execute function public.video_key_visita();

-- Visita online: si paga solo con carta, in anticipo (autorizzata alla richiesta, addebitata alla conferma)
create or replace function public.visita_online_carta() returns trigger
language plpgsql as $$
begin
  if new.online and coalesce(new.origine, 'app') = 'app' and new.metodo_pagamento <> 'carta' then
    raise exception 'La visita online si paga con carta, in anticipo' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists visita_online_carta on public.appointments;
create trigger visita_online_carta before insert on public.appointments
  for each row execute function public.visita_online_carta();
