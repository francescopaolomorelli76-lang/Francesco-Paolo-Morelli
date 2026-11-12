-- =====================================================================
-- CLINIA APP · Migrazione 014: royalty d'autore 4,99 € per ora di studio (12/11/2026).
--   · il contratto FPM–Clinia è una cessione dei diritti d'autore con corrispettivo misto:
--     parte fissa (12 rate da 300 € netti o 3.000 € netti) + royalty a tempo indeterminato:
--     4,99 € netti per ogni ora di studio prenotata, con qualsiasi formula, versati da Clinia,
--     e 50 € al mese per ogni specialista abbonato
--   · FPM dona il 3 % della royalty oraria a Progetto Arca
--   · fpm_pagamenti: una riga per mese e per voce ('licenza' | 'royalty')
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
delete from public.app_settings where chiave = 'canone_tecnologico';
insert into public.app_settings (chiave, valore) values ('royalty_ore',
  '{"euro_ora_netti":4.99,"a_carico":"clinia","base":"ore di studio prenotate e confermate, qualsiasi formula","arca_pct":0.03,"durata":"tempo indeterminato","natura":"royalty diritti d''autore"}')
on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now();

create or replace function public.royalty_euro_ora() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (valore->>'euro_ora_netti')::numeric from public.app_settings where chiave = 'royalty_ore'), 4.99)
$$;

-- Ore di studio del mese e royalty dovuta da Clinia (stesso nome della 013 per compatibilità)
create or replace function public.canone_mese(p_mese date)
returns table (ore numeric, canone numeric, arca numeric)
language sql stable security definer set search_path = public as $$
  with o as (
    select coalesce(sum(extract(epoch from (fine - inizio)) / 3600), 0)::numeric(10,2) as ore
    from public.room_bookings
    where stato = 'confermata' and giorno >= date_trunc('month', p_mese) and giorno < date_trunc('month', p_mese) + interval '1 month'
  )
  select o.ore, round(o.ore * public.royalty_euro_ora(), 2), round(o.ore * public.royalty_euro_ora() * 0.03, 2) from o
$$;
revoke all on function public.canone_mese(date) from public, anon;
grant execute on function public.canone_mese(date) to authenticated;

-- Pagamenti a FPM: chiave (mese, voce)
alter table public.fpm_pagamenti drop constraint if exists fpm_pagamenti_pkey;
alter table public.fpm_pagamenti add constraint fpm_pagamenti_voce_ok check (voce in ('licenza','royalty')) not valid;
alter table public.fpm_pagamenti add primary key (mese, voce);

-- Accrediti a FPM: nuova voce royalty
alter table public.fpm_transfers drop constraint if exists fpm_transfers_tipo_check;
alter table public.fpm_transfers add constraint fpm_transfers_tipo_check
  check (tipo in ('servizio_paziente','servizio_specialista','abbonamento','licenza','royalty'));
