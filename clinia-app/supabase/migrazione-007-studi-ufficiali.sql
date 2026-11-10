-- =====================================================================
-- CLINIA APP · Migrazione 007: i 6 studi ufficiali di Clinia Srl e il tariffario mensile.
-- Fonte: "Dettaglio servizi con tariffe" di Clinia Srl. Studi 1–3 da 15 mq, studio 4 da 20 mq,
-- studi 5–6 da 12 mq. Tariffe al mese, IVA esclusa:
--   Soluzione A (mezza giornata): 12 mq 1.200 €, 15 mq 1.400 €, 20 mq 1.700 €
--   Soluzione B (giornata intera): 12 mq 2.000 €, 15 mq 2.500 €, 20 mq 3.000 €
-- Gli studi 7–9 (segnaposto delle prime versioni) vengono disattivati, non cancellati.
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
alter table public.rooms add column if not exists mq int;
alter table public.rooms add column if not exists descrizione text;

update public.rooms as r set nome = v.nome, tipo = v.tipo, mq = v.mq, descrizione = v.descrizione, attivo = true
from (values
  ('s1','Studio 1','standard',15,'Ambiente accogliente e funzionale, dotato di scrivania, sedie, lettino e lavandino. Pensato per visite mediche e attività specialistiche. Completamente accessoriato e climatizzato.'),
  ('s2','Studio 2','standard',15,'Spazio pratico e riservato, attrezzato con scrivania, sedie, lettino e lavandino. Ideale per attività cliniche e specialistiche, climatizzato e pronto all''uso.'),
  ('s3','Studio 3','standard',15,'Studio confortevole e ben organizzato, con scrivania, sedie, lettino e lavandino. Adatto a visite mediche e attività di consulenza. Climatizzato.'),
  ('s4','Studio 4','ampio',20,'Ambiente luminoso, ampio e climatizzato, per attività cliniche e riabilitative, formazione, piccoli workshop, incontri professionali e sessioni dimostrative.'),
  ('s5','Studio 5','compatto',12,'Studio raccolto e accogliente, pensato per colloqui e consulenze. Allestito con scrivania e sedie, climatizzato e pronto all''uso.'),
  ('s6','Studio 6','compatto',12,'Ambiente luminoso e riservato, climatizzato e pronto all''uso, dotato di scrivania e sedie. Perfetto per visite, consulenze e attività di ascolto.')
) as v(id,nome,tipo,mq,descrizione)
where r.id = v.id;

update public.rooms set attivo = false where id in ('s7','s8','s9');

insert into public.app_settings (chiave, valore) values ('tariffe_studi_mese',
  '{"iva":0.22,"iva_esclusa":true,"A":{"descrizione":"mese, mezza giornata","12":1200,"15":1400,"20":1700},"B":{"descrizione":"mese, giornata intera","12":2000,"15":2500,"20":3000},"fonte":"Clinia Srl – Dettaglio servizi con tariffe"}')
on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now();

insert into public.app_settings (chiave, valore) values ('clinica',
  '{"ragione_sociale":"Clinia Srl","indirizzo":"Via La Martella 5/D – 75100 Matera (MT)","email":"info@cliniamatera.it","pec":"clinia@pec.it","telefono":"+39 3293975297","payoff":"Il centro per professionisti e specialisti"}')
on conflict (chiave) do update set valore = public.app_settings.valore || excluded.valore, aggiornato_il = now();
