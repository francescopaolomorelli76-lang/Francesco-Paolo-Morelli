-- =====================================================================
-- CLINIA APP · Migrazione 022: chat tra pazienti, dottori, enti, Clinia e FPM (26/11/2026).
--   · una conversazione per ogni coppia: "user:<id>", "spec:<id>", "titolare", "admin"
--   · ognuno vede solo le proprie conversazioni; FPM (admin) le vede tutte e può rispondere ovunque
--   · ogni messaggio crea una notifica per l'altra parte; tempo reale con Supabase Realtime
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
create table if not exists public.chat (
  id          uuid primary key default gen_random_uuid(),
  parte_a     text not null,
  parte_b     text not null,
  creata_il   timestamptz not null default now(),
  ultimo_il   timestamptz not null default now(),
  unique (parte_a, parte_b),
  check (parte_a < parte_b)
);
create table if not exists public.chat_messaggi (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.chat(id) on delete cascade,
  mittente    text not null,
  testo       text not null check (length(testo) between 1 and 4000),
  inviato_il  timestamptz not null default now()
);
create index if not exists chat_messaggi_chat on public.chat_messaggi (chat_id, inviato_il);
create table if not exists public.chat_letture (
  chat_id uuid references public.chat(id) on delete cascade, parte text, letto_il timestamptz not null default now(), primary key (chat_id, parte));

-- Le "parti" dell'utente collegato
create or replace function public.mie_parti() returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    'user:' || auth.uid()::text,
    (select 'spec:' || s.id from specialists s where s.user_id = auth.uid() and not coalesce(s.is_titolare,false) limit 1),
    case when public.sono_titolare() then 'titolare' end,
    case when public.sono_admin() then 'admin' end], null)
$$;
alter table public.chat enable row level security;
alter table public.chat_messaggi enable row level security;
alter table public.chat_letture enable row level security;
drop policy if exists chat_vedi on public.chat;
drop policy if exists chat_crea on public.chat;
drop policy if exists chat_msg_vedi on public.chat_messaggi;
drop policy if exists chat_msg_scrivi on public.chat_messaggi;
drop policy if exists chat_letture_mie on public.chat_letture;
create policy chat_vedi on public.chat for select using (public.sono_admin() or parte_a = any(public.mie_parti()) or parte_b = any(public.mie_parti()));
create policy chat_crea on public.chat for insert with check (public.sono_admin() or parte_a = any(public.mie_parti()) or parte_b = any(public.mie_parti()));
create policy chat_msg_vedi on public.chat_messaggi for select using (exists (select 1 from public.chat c where c.id = chat_id
  and (public.sono_admin() or c.parte_a = any(public.mie_parti()) or c.parte_b = any(public.mie_parti()))));
create policy chat_msg_scrivi on public.chat_messaggi for insert with check (mittente = any(public.mie_parti()) and exists (select 1 from public.chat c where c.id = chat_id
  and (public.sono_admin() or c.parte_a = any(public.mie_parti()) or c.parte_b = any(public.mie_parti()))));
create policy chat_letture_mie on public.chat_letture for all using (parte = any(public.mie_parti())) with check (parte = any(public.mie_parti()));

-- Notifica all'altra parte a ogni messaggio
create or replace function public.notifica_messaggio() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; dest text; titolo text;
begin
  select * into c from chat where id = new.chat_id;
  update chat set ultimo_il = new.inviato_il where id = new.chat_id;
  titolo := 'Nuovo messaggio da ' || case when new.mittente = 'admin' then 'FPM' when new.mittente = 'titolare' then 'Clinia'
    when new.mittente like 'spec:%' then coalesce((select nome_visualizzato from specialists where id = substr(new.mittente, 6)), 'un dottore') else 'un paziente' end;
  foreach dest in array array[c.parte_a, c.parte_b] loop
    if dest = new.mittente then continue; end if;
    if dest = 'admin' or dest = 'titolare' then
      insert into notifiche (per_ruolo, tipo, titolo, testo) values (dest, 'messaggio', titolo, left(new.testo, 140));
    elsif dest like 'spec:%' then
      insert into notifiche (per_specialista, tipo, titolo, testo) values (substr(dest, 6), 'messaggio', titolo, left(new.testo, 140));
    elsif dest like 'user:%' then
      insert into notifiche (per_user, tipo, titolo, testo) values (substr(dest, 6)::uuid, 'messaggio', titolo, left(new.testo, 140));
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists notifica_messaggio on public.chat_messaggi;
create trigger notifica_messaggio after insert on public.chat_messaggi for each row execute function public.notifica_messaggio();

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messaggi') then
    alter publication supabase_realtime add table public.chat_messaggi;
  end if;
end $$;
