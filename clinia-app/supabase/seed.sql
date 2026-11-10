-- CLINIA APP · Dati iniziali (generati dalla configurazione dell'app)
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- Prezzi e tariffe sono DI ESEMPIO finché non arriva il tariffario ufficiale.

insert into public.rooms (id,nome,tipo) values
  ('s1','Studio 1','standard'),
  ('s2','Studio 2','standard'),
  ('s3','Studio 3','standard'),
  ('s4','Studio 4','ampio'),
  ('s5','Studio 5','compatto'),
  ('s6','Studio 6','compatto'),
  ('s7','Studio 7','standard'),
  ('s8','Studio 8','standard'),
  ('s9','Studio 9','standard')
on conflict (id) do update set nome=excluded.nome, tipo=excluded.tipo;

insert into public.room_tariffs (tipo,ora,mezza,giornata,ufficiale) values
  ('standard',15,50,90,false),
  ('ampio',20,65,120,false),
  ('compatto',12,40,75,false)
on conflict (tipo) do update set ora=excluded.ora, mezza=excluded.mezza, giornata=excluded.giornata;

insert into public.opening_hours (giorno_settimana,apertura,chiusura) values
  (0,null,null),
  (1,'08:00','20:00'),
  (2,'08:00','20:00'),
  (3,'08:00','20:00'),
  (4,'08:00','20:00'),
  (5,'08:00','20:00'),
  (6,'08:00','13:00')
on conflict (giorno_settimana) do update set apertura=excluded.apertura, chiusura=excluded.chiusura;

insert into public.specialists (id,titolo,nome_visualizzato,ruolo,area,bio,foto_url,genere,visita_bambini,valutazione,recensioni,is_titolare) values
  ('marco-morelli','Dott.','Dott. Marco Morelli','Fisioterapista','riabilitazione',array['Formazione presso l’Università Aldo Moro (Bari)','Tirocinio presso l’Ospedale Madonna delle Grazie (Matera)','Tirocinio presso l’Ospedale Don Gnocchi (Tricarico)']::text[],'img/specialisti/marco-morelli.jpg','M',false,5.0,23,true),
  ('enrico-pierangeli','Prof.','Prof. Enrico Pierangeli','Specialista in Neurochirurgia, Neurologia e Oncologia','chirurgia',array['Professore a contratto di Neurochirurgia presso la L.U.M. di Casamassima','Direttore della Neurochirurgia dell’Ospedale SS. Annunziata di Taranto (1997–2011)','Oltre 4.000 interventi eseguiti come primo operatore','Autore di circa 200 pubblicazioni scientifiche']::text[],'img/specialisti/enrico-pierangeli.jpg','M',false,null,null,false),
  ('feliciana-pellegrino','Dott.ssa','Dott.ssa Feliciana Pellegrino','Fisioterapista','riabilitazione',array['Laureata in Fisioterapia all’Università Aldo Moro con 110 e lode','Riabilitazione ortopedica, neurologica, pediatrica, oncologica e cardio-respiratoria','Formazione in Kinesio Taping Method']::text[],'img/specialisti/feliciana-pellegrino.jpg','F',true,null,null,false),
  ('michele-picciallo','Dott.','Dott. Michele Picciallo','Medico chirurgo – Specialista in Dermatologia e Venereologia','medicina',array['Specializzazione all’Università di Bari con 70/70 e lode','Master di II livello in Laser in Dermatologia (Sapienza, Roma)','Esperienza in dermoscopia e tumori cutanei']::text[],'img/specialisti/michele-picciallo.jpg','M',false,null,null,false),
  ('vincenzo-de-leo','Dott.','Dott. Vincenzo De Leo','Chirurgo generale – Chirurgia oncologica, laparoscopica e robotica','chirurgia',array['Specialista in Chirurgia Generale','Chirurgia mininvasiva, laparoscopica e robotica','Patologie del colon-retto, tiroide, colecisti, ernie e proctologia']::text[],'img/specialisti/vincenzo-de-leo.jpg','M',false,null,null,false),
  ('donato-panetta','Dott.','Dott. Donato Panetta','Specialista in Ortopedia e Traumatologia','chirurgia',array['Chirurgo ortopedico con oltre vent’anni di esperienza','Chirurgia artroscopica del ginocchio','Chirurgia del piede e della mano']::text[],'img/specialisti/donato-panetta.jpg','M',true,null,null,false),
  ('maria-alessandra-lassandro','Dott.ssa','Dott.ssa Maria Alessandra Lassandro','Medico chirurgo – Allergologia e Immunologia Clinica, Medicina Estetica ed Ecografia Clinica','medicina',array['Specialista in Allergologia e Immunologia Clinica (Università di Bari, con lode)','Prick test, patch test, spirometria','Formazione in Medicina Estetica ed Ecografia Clinica SIUMB']::text[],'img/specialisti/maria-alessandra-lassandro.jpg','F',false,null,null,false),
  ('francesca-trabace',null,'Francesca Trabace','Osteopata D.O.','riabilitazione',array['Osteopata D.O. diplomata presso ATSAI Still Academy Italia','Formazione in osteopatia pediatrica','Approccio osteopatico alle disfunzioni dell’ATM']::text[],'img/specialisti/francesca-trabace.jpg','F',true,null,null,false),
  ('angelo-costantiello',null,'Angelo Costantiello','Tecnico ortopedico – Biomeccanica del piede e ortesi personalizzate','riabilitazione',array['Tecnico ortopedico con oltre 30 anni di esperienza','Baropodometria e valutazione posturale','Plantari personalizzati con tecnologie CAD-CAM']::text[],'img/specialisti/angelo-costantiello.jpg','M',false,null,null,false),
  ('rossella-conversano',null,'Rossella Conversano','Laureata in Scienze Motorie – Personal Trainer e Attività Motoria Funzionale','riabilitazione',array['Laureata in Scienze Motorie e Attività Sportive','Personal Trainer qualificata ENDAS','Percorsi personalizzati di attività motoria funzionale']::text[],'img/specialisti/rossella-conversano.jpg','F',false,null,null,false)
on conflict (id) do update set nome_visualizzato=excluded.nome_visualizzato, ruolo=excluded.ruolo, area=excluded.area, bio=excluded.bio;

delete from public.services where specialist_id in ('marco-morelli','enrico-pierangeli','feliciana-pellegrino','michele-picciallo','vincenzo-de-leo','donato-panetta','maria-alessandra-lassandro','francesca-trabace','angelo-costantiello','rossella-conversano');
insert into public.services (specialist_id,nome,durata_min,prezzo,online,ordine) values
  ('marco-morelli','Valutazione fisioterapica',45,50,false,0),
  ('marco-morelli','Seduta di fisioterapia',45,40,false,1),
  ('marco-morelli','Terapia manuale',30,35,false,2),
  ('marco-morelli','Consulenza fisioterapica online',30,30,true,3),
  ('enrico-pierangeli','Consulenza neurochirurgica',30,150,false,0),
  ('enrico-pierangeli','Visita di controllo',20,100,false,1),
  ('enrico-pierangeli','Consulenza online su esami e referti',30,100,true,2),
  ('feliciana-pellegrino','Valutazione fisioterapica',45,50,false,0),
  ('feliciana-pellegrino','Seduta di fisioterapia',45,40,false,1),
  ('feliciana-pellegrino','Kinesio taping',30,30,false,2),
  ('michele-picciallo','Visita dermatologica',30,100,false,0),
  ('michele-picciallo','Mappatura nei in dermoscopia',30,120,false,1),
  ('michele-picciallo','Visita di controllo',20,70,false,2),
  ('michele-picciallo','Consulenza dermatologica online',20,60,true,3),
  ('vincenzo-de-leo','Visita chirurgica',30,120,false,0),
  ('vincenzo-de-leo','Visita proctologica',30,120,false,1),
  ('vincenzo-de-leo','Visita di controllo',20,80,false,2),
  ('donato-panetta','Visita ortopedica',30,120,false,0),
  ('donato-panetta','Visita di controllo',20,80,false,1),
  ('maria-alessandra-lassandro','Visita allergologica',30,110,false,0),
  ('maria-alessandra-lassandro','Prick test',30,80,false,1),
  ('maria-alessandra-lassandro','Ecografia clinica',30,90,false,2),
  ('maria-alessandra-lassandro','Consulenza di medicina estetica',30,80,false,3),
  ('maria-alessandra-lassandro','Consulenza allergologica online',20,60,true,4),
  ('francesca-trabace','Trattamento osteopatico',45,60,false,0),
  ('francesca-trabace','Osteopatia pediatrica',45,60,false,1),
  ('angelo-costantiello','Esame baropodometrico',45,60,false,0),
  ('angelo-costantiello','Valutazione per plantari su misura',30,40,false,1),
  ('rossella-conversano','Seduta di personal training',60,40,false,0),
  ('rossella-conversano','Valutazione motoria funzionale',45,35,false,1);

-- Turni fissi di esempio negli studi per le prossime 3 settimane (da sostituire con quelli reali).
insert into public.room_bookings (specialist_id,room_id,giorno,inizio,fine,stato,gratuito,turno_fisso)
select s.sp, s.room, d::date, s.inizio::time, s.fine::time, 'confermata', s.sp='marco-morelli', true
from (values
  ('marco-morelli','s4','09:00','13:00',array['1','2','3','4','5']::text[]),
  ('feliciana-pellegrino','s4','14:00','19:00',array['1','3','5']::text[]),
  ('enrico-pierangeli','s1','15:00','19:00',array['2']::text[]),
  ('michele-picciallo','s2','15:00','19:00',array['1','4']::text[]),
  ('vincenzo-de-leo','s1','09:00','13:00',array['3']::text[]),
  ('donato-panetta','s2','09:00','13:00',array['2','5']::text[]),
  ('maria-alessandra-lassandro','s3','15:00','19:00',array['1','3']::text[]),
  ('francesca-trabace','s5','09:00','13:00',array['2','4']::text[]),
  ('angelo-costantiello','s6','09:00','13:00',array['6']::text[]),
  ('angelo-costantiello','s6','15:00','19:00',array['3']::text[]),
  ('rossella-conversano','s4','16:00','20:00',array['2','4']::text[])
) as s(sp,room,inizio,fine,giorni)
cross join generate_series(current_date, current_date + 21, interval '1 day') d
where extract(dow from d)::text = any(s.giorni)
on conflict do nothing;
