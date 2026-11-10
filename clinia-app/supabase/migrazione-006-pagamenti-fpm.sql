-- =====================================================================
-- CLINIA APP · Migrazione 006: voce "Pagato" per i compensi di FPM.
-- Clinia registra come ha pagato la licenza del mese (automatico, bonifico o contanti
-- con ricevuta mensile); FPM vede lo stato in tempo reale e conferma di aver ricevuto.
-- Se il metodo scelto non è "automatico", la funzione licenza-fpm non addebita nulla.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
create table if not exists public.fpm_pagamenti (
  mese            date primary key check (extract(day from mese) = 1),
  voce            text not null default 'licenza',
  importo_netto   numeric(10,2) not null check (importo_netto >= 0),
  metodo          text not null check (metodo in ('automatico','bonifico','contanti')),
  pagato_il       date not null default current_date,
  nota            text,
  registrato_da   uuid references auth.users(id) default auth.uid(),
  registrato_il   timestamptz not null default now(),
  confermato_fpm  boolean not null default false,
  confermato_il   timestamptz
);
alter table public.fpm_pagamenti enable row level security;

drop policy if exists fpm_pagamenti_lettura on public.fpm_pagamenti;
drop policy if exists fpm_pagamenti_clinia on public.fpm_pagamenti;
drop policy if exists fpm_pagamenti_clinia_mod on public.fpm_pagamenti;
drop policy if exists fpm_pagamenti_clinia_del on public.fpm_pagamenti;
drop policy if exists fpm_pagamenti_fpm on public.fpm_pagamenti;
create policy fpm_pagamenti_lettura on public.fpm_pagamenti for select using (public.sono_titolare() or public.sono_admin());
create policy fpm_pagamenti_clinia on public.fpm_pagamenti for insert with check (public.sono_titolare());
create policy fpm_pagamenti_clinia_mod on public.fpm_pagamenti for update using (public.sono_titolare() and not confermato_fpm) with check (public.sono_titolare());
create policy fpm_pagamenti_clinia_del on public.fpm_pagamenti for delete using (public.sono_titolare() and not confermato_fpm);
create policy fpm_pagamenti_fpm on public.fpm_pagamenti for update using (public.sono_admin()) with check (public.sono_admin());

-- Ognuno cambia solo i propri campi: Clinia il pagamento, FPM la conferma di ricezione.
create or replace function public.fpm_pagamenti_campi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- funzioni del server (service_role)
  if public.sono_admin() then
    if (new.mese, new.voce, new.importo_netto, new.metodo, new.pagato_il, new.nota, new.registrato_da)
       is distinct from (old.mese, old.voce, old.importo_netto, old.metodo, old.pagato_il, old.nota, old.registrato_da) then
      raise exception 'FPM può solo confermare la ricezione' using errcode = '42501';
    end if;
    new.confermato_il := case when new.confermato_fpm then coalesce(old.confermato_il, now()) end;
  elsif tg_op = 'INSERT' then
    new.confermato_fpm := false; new.confermato_il := null; new.registrato_da := auth.uid();
  else
    new.confermato_fpm := old.confermato_fpm; new.confermato_il := old.confermato_il;
  end if;
  return new;
end $$;
drop trigger if exists fpm_pagamenti_campi on public.fpm_pagamenti;
create trigger fpm_pagamenti_campi before insert or update on public.fpm_pagamenti
  for each row execute function public.fpm_pagamenti_campi();

-- Metodo scelto da Clinia per la licenza (automatico | bonifico | contanti)
insert into public.app_settings (chiave, valore) values ('licenza_metodo', '{"metodo":"automatico"}')
on conflict (chiave) do nothing;
-- (Clinia la modifica già con la policy impostazioni_scrittura della migrazione 002)

-- I pagamenti automatici registrati dalla funzione licenza-fpm (service_role) entrano qui già confermati.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'fpm_pagamenti')
     and exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.fpm_pagamenti;
  end if;
end $$;
