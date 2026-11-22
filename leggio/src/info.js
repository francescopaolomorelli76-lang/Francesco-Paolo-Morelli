// ================= Informazioni dello spartito: compositori famosi (con volto), riconoscimento del brano, trama delle opere =================
// c: [nome, cognome per la ricerca, anni, paese, genere abituale, aspetto del volto, cenni sulla vita, cosa ha composto]
const K_WIG='#f2efe8';
const K_COMP=[
 ['Claudio Monteverdi','Monteverdi','1567–1643','Italia','Sacra',{h:'short',hc:'#3b2a1d',b:'full'},"Cremonese, ponte tra Rinascimento e Barocco; maestro di cappella a San Marco a Venezia.","L'Orfeo, Vespro della Beata Vergine, L'incoronazione di Poppea, madrigali."],
 ['Giovanni Pierluigi da Palestrina','Palestrina','1525–1594','Italia','Sacra',{h:'short',hc:'#8a8a8a',b:'full'},"Maestro della polifonia sacra del Rinascimento, attivo a Roma.","Missa Papae Marcelli, mottetti, Stabat Mater."],
 ['Antonio Vivaldi','Vivaldi','1678–1741','Italia','Sinfonica',{h:'long',hc:'#c4532a'},"Veneziano, il «prete rosso», insegnò all'Ospedale della Pietà; maestro del concerto barocco.","Le quattro stagioni, Gloria RV 589, oltre 500 concerti, opere."],
 ['Johann Sebastian Bach','Bach','1685–1750','Germania','Sacra',{h:'wig',hc:K_WIG},"Organista e cantore a Lipsia, vertice del contrappunto barocco; padre di una famiglia di musicisti.","Passione secondo Matteo, Messa in si minore, Concerti brandeburghesi, Variazioni Goldberg, cantate."],
 ['Georg Friedrich Händel','Händel','1685–1759','Germania / Inghilterra','Sacra',{h:'wig',hc:K_WIG,b:''},"Tedesco naturalizzato inglese, grande autore di opere e oratori.","Messiah (Hallelujah), Water Music, Musica per i reali fuochi d'artificio, Rinaldo."],
 ['Domenico Scarlatti','Scarlatti','1685–1757','Italia','Strumentale',{h:'wig',hc:K_WIG},"Napoletano, visse alla corte di Spagna e Portogallo.","Oltre 550 sonate per clavicembalo."],
 ['Johann Pachelbel','Pachelbel','1653–1706','Germania','Strumentale',{h:'wig',hc:'#cfc7b8'},"Organista di Norimberga, maestro del Barocco tedesco.","Canone in re maggiore, corali per organo."],
 ['Arcangelo Corelli','Corelli','1653–1713','Italia','Strumentale',{h:'wig',hc:'#d9d2c4'},"Violinista, fissò la forma del concerto grosso.","Concerti grossi op. 6 (Natale), sonate per violino."],
 ['Tomaso Albinoni','Albinoni','1671–1751','Italia','Strumentale',{h:'wig',hc:'#d9d2c4'},"Veneziano, autore di opere e concerti con oboe.","Concerti per oboe (l'«Adagio» famoso è di Remo Giazotto)."],
 ['Henry Purcell','Purcell','1659–1695','Inghilterra','Opera',{h:'wig',hc:'#6b4a2f'},"Il maggior compositore barocco inglese.","Dido and Aeneas, King Arthur, The Fairy-Queen."],
 ['Giovanni Battista Pergolesi','Pergolesi','1710–1736','Italia','Sacra',{h:'wig',hc:K_WIG},"Morto a 26 anni, lasciò capolavori di opera buffa e musica sacra.","La serva padrona, Stabat Mater."],
 ['Christoph Willibald Gluck','Gluck','1714–1787','Germania','Opera',{h:'wig',hc:K_WIG},"Riformatore dell'opera seria, cercò verità drammatica.","Orfeo ed Euridice, Alceste, Ifigenia in Tauride."],
 ['Franz Joseph Haydn','Haydn','1732–1809','Austria','Sinfonica',{h:'wig',hc:K_WIG},"«Papà Haydn», maestro della sinfonia e del quartetto, al servizio degli Esterházy.","Sinfonie «London», La Creazione, Le stagioni, quartetti."],
 ['Wolfgang Amadeus Mozart','Mozart','1756–1791','Austria','Opera',{h:'wig',hc:K_WIG},"Bambino prodigio di Salisburgo, visse a Vienna; scrisse in ogni genere, dall'opera alla sinfonia.","Le nozze di Figaro, Don Giovanni, Così fan tutte, Il flauto magico, Requiem, Eine kleine Nachtmusik."],
 ['Domenico Cimarosa','Cimarosa','1749–1801','Italia','Opera',{h:'wig',hc:K_WIG},"Maestro dell'opera buffa napoletana.","Il matrimonio segreto."],
 ['Luigi Cherubini','Cherubini','1760–1842','Italia','Opera',{h:'short',hc:'#cfcfcf'},"Fiorentino attivo a Parigi, direttore del Conservatorio.","Medea, Requiem in do minore."],
 ['Ludwig van Beethoven','Beethoven','1770–1827','Germania','Sinfonica',{h:'wild',hc:'#7c7468'},"Nato a Bonn e attivo a Vienna; sordo, continuò a comporre capolavori che aprono al Romanticismo.","9 sinfonie, 32 sonate per pianoforte, Fidelio, Missa solemnis, Per Elisa."],
 ['Gioachino Rossini','Rossini','1792–1868','Italia','Opera',{h:'curly',hc:'#7a5a3a',b:'sides'},"Pesarese, re dell'opera buffa; a 37 anni lasciò il teatro e visse da gastronomo a Parigi.","Il barbiere di Siviglia, La Cenerentola, Guglielmo Tell, Stabat Mater, Petite messe solennelle."],
 ['Franz Schubert','Schubert','1797–1828','Austria','Lirica da camera',{h:'curly',hc:'#4a3526',g:1},"Viennese, morto a 31 anni; re del Lied.","Ave Maria, Winterreise, Die schöne Müllerin, Sinfonia incompiuta, La trota."],
 ['Gaetano Donizetti','Donizetti','1797–1848','Italia','Opera',{h:'side',hc:'#3a2a1e',b:'sides'},"Bergamasco, prolifico autore di opere serie e buffe.","L'elisir d'amore, Lucia di Lammermoor, Don Pasquale, Anna Bolena."],
 ['Vincenzo Bellini','Bellini','1801–1835','Italia','Opera',{h:'curly',hc:'#c9a56a',b:'sides'},"Catanese, morto a 33 anni; maestro del belcanto.","Norma, La sonnambula, I puritani, I Capuleti e i Montecchi."],
 ['Hector Berlioz','Berlioz','1803–1869','Francia','Sinfonica',{h:'wild',hc:'#b9b2a5'},"Innovatore dell'orchestra romantica.","Sinfonia fantastica, La damnation de Faust, Les Troyens."],
 ['Felix Mendelssohn','Mendelssohn','1809–1847','Germania','Sinfonica',{h:'side',hc:'#2f2218',b:'sides'},"Prodigio di Amburgo, riportò Bach in concerto a Lipsia.","Sogno di una notte di mezza estate, Sinfonia «Italiana», Elias, Concerto per violino."],
 ['Frédéric Chopin','Chopin','1810–1849','Polonia / Francia','Strumentale',{h:'side',hc:'#6b4a2f'},"Poeta del pianoforte, visse a Parigi.","Notturni, Polacche, Mazurche, Ballate, Studi, Preludi."],
 ['Robert Schumann','Schumann','1810–1856','Germania','Lirica da camera',{h:'side',hc:'#4a3a2c'},"Compositore e critico, sposò la pianista Clara Wieck.","Scene infantili, Carnaval, Dichterliebe, Sinfonia «Renana»."],
 ['Franz Liszt','Liszt','1811–1886','Ungheria','Strumentale',{h:'long',hc:'#cfcac0'},"Virtuoso del pianoforte e inventore del poema sinfonico.","Rapsodie ungheresi, Sogno d'amore, Années de pèlerinage."],
 ['Richard Wagner','Wagner','1813–1883','Germania','Opera',{h:'bald',hc:'#cfc7b8'},"Rivoluzionò l'opera con il «dramma musicale» e il teatro di Bayreuth.","Tristano e Isotta, L'anello del Nibelungo, Lohengrin, Parsifal."],
 ['Giuseppe Verdi','Verdi','1813–1901','Italia','Opera',{h:'short',hc:'#e6e2d8',b:'full',bg:'#3b2c18'},"Nato a Le Roncole (Busseto), cantore del Risorgimento e maestro del melodramma italiano.","Nabucco, Rigoletto, Il trovatore, La traviata, Aida, Otello, Falstaff, Messa da Requiem."],
 ['Charles Gounod','Gounod','1818–1893','Francia','Opera',{h:'bald',hc:'#d8d2c6',b:'full'},"Autore di opere e musica sacra.","Faust, Roméo et Juliette, Ave Maria su Bach."],
 ['César Franck','Franck','1822–1890','Belgio / Francia','Sacra',{h:'short',hc:'#d9d4c8',b:'sides'},"Organista di Sainte-Clotilde a Parigi.","Panis angelicus, Sinfonia in re minore, Sonata per violino."],
 ['Anton Bruckner','Bruckner','1824–1896','Austria','Sinfonica',{h:'bald',hc:'#cfc9bd'},"Organista, autore di grandi sinfonie e musica sacra.","Sinfonie n. 4, 7, 8, Te Deum, Ave Maria."],
 ['Johann Strauss II','Strauss','1825–1899','Austria','Sinfonica',{h:'curly',hc:'#2d2018',b:'stache'},"Il «re del valzer» di Vienna.","Sul bel Danubio blu, Il pipistrello, Valzer dell'imperatore."],
 ['Johannes Brahms','Brahms','1833–1897','Germania','Sinfonica',{h:'short',hc:'#a79f92',b:'full'},"Amburghese, erede del classicismo, vissuto a Vienna.","Ein deutsches Requiem, 4 sinfonie, Danze ungheresi, Ninna nanna."],
 ['Camille Saint-Saëns','Saint-Saëns','1835–1921','Francia','Sinfonica',{h:'bald',hc:'#d8d2c6',b:'full'},"Pianista e organista, autore versatile.","Il carnevale degli animali, Sansone e Dalila, Sinfonia con organo."],
 ['Georges Bizet','Bizet','1838–1875','Francia','Opera',{h:'short',hc:'#2b2018',b:'full',g:1},"Morì a 36 anni, pochi mesi dopo la prima di Carmen.","Carmen, I pescatori di perle, L'Arlésienne."],
 ['Modest Musorgskij','Musorgskij','1839–1881','Russia','Opera',{h:'wild',hc:'#4a3a2c',b:'full'},"Del «Gruppo dei Cinque», originale e realista.","Quadri di un'esposizione, Boris Godunov, Una notte sul Monte Calvo."],
 ['Pëtr Il\'ič Čajkovskij','Čajkovskij','1840–1893','Russia','Sinfonica',{h:'short',hc:'#e0dcd2',b:'full'},"Il maggior sinfonista romantico russo.","Il lago dei cigni, Lo schiaccianoci, Eugenio Onegin, Concerto per pianoforte n. 1."],
 ['Antonín Dvořák','Dvořák','1841–1904','Boemia','Sinfonica',{h:'short',hc:'#3a2a20',b:'full'},"Fuse melodie popolari boeme e americane.","Sinfonia «Dal Nuovo Mondo», Danze slave, Rusalka."],
 ['Arrigo Boito','Boito','1842–1918','Italia','Opera',{h:'wild',hc:'#6b6258',b:'full'},"Poeta e compositore, librettista di Verdi.","Mefistofele; libretti di Otello e Falstaff."],
 ['Edvard Grieg','Grieg','1843–1907','Norvegia','Strumentale',{h:'wild',hc:'#e7e3da',b:'stache'},"Il musicista nazionale norvegese.","Peer Gynt, Concerto per pianoforte, Pezzi lirici."],
 ['Gabriel Fauré','Fauré','1845–1924','Francia','Sacra',{h:'short',hc:'#d9d4c8',b:'stache'},"Maestro della melodia francese e dell'armonia raffinata.","Requiem, Pavane, Pelléas et Mélisande."],
 ['Francesco Paolo Tosti','Tosti','1846–1916','Italia','Lirica da camera',{h:'short',hc:'#5b4636',b:'stache'},"Abruzzese, maestro della romanza da salotto.","'A vucchella, Ideale, Marechiare, Aprile."],
 ['Amilcare Ponchielli','Ponchielli','1834–1886','Italia','Opera',{h:'side',hc:'#3a2a20',b:'full'},"Cremonese, maestro d'opera tra Verdi e Puccini.","La Gioconda (Danza delle ore), I promessi sposi."],
 ['Ruggero Leoncavallo','Leoncavallo','1857–1919','Italia','Opera',{h:'short',hc:'#2d2018',b:'stache'},"Napoletano, esponente del verismo.","Pagliacci, Zazà, «Mattinata»."],
 ['Giacomo Puccini','Puccini','1858–1924','Italia','Opera',{h:'side',hc:'#3b2d22',b:'stache',bg:'#3b2c18'},"Lucchese, erede di Verdi e dominatore del teatro d'opera tra Otto e Novecento.","Manon Lescaut, La Bohème, Tosca, Madama Butterfly, Gianni Schicchi, Turandot (incompiuta)."],
 ['Gustav Mahler','Mahler','1860–1911','Austria / Boemia','Sinfonica',{h:'short',hc:'#3a3027',g:1},"Direttore e compositore di immense sinfonie e di Lieder orchestrali.","9 sinfonie, Das Lied von der Erde, Kindertotenlieder."],
 ['Claude Debussy','Debussy','1862–1918','Francia','Strumentale',{h:'curly',hc:'#2b2118',b:'full'},"Padre dell'impressionismo musicale.","Clair de lune, Preludio al pomeriggio di un fauno, La mer, Pelléas et Mélisande."],
 ['Pietro Mascagni','Mascagni','1863–1945','Italia','Opera',{h:'wild',hc:'#2b2018',b:'stache'},"Livornese, caposcuola del verismo.","Cavalleria rusticana, L'amico Fritz, Iris."],
 ['Richard Strauss','Strauss','1864–1949','Germania','Opera',{h:'bald',hc:'#c9c3b7'},"Autore di poemi sinfonici e di opere.","Also sprach Zarathustra, Salome, Il cavaliere della rosa, Quattro ultimi Lieder."],
 ['Umberto Giordano','Giordano','1867–1948','Italia','Opera',{h:'side',hc:'#2d2018',b:'stache'},"Foggiano, verista.","Andrea Chénier, Fedora."],
 ['Francesco Cilea','Cilea','1866–1950','Italia','Opera',{h:'short',hc:'#b9b2a5',b:'stache'},"Calabrese, autore di opere liriche.","Adriana Lecouvreur, L'arlesiana."],
 ['Erik Satie','Satie','1866–1925','Francia','Strumentale',{h:'short',hc:'#3a3027',g:1,b:'goatee'},"Eccentrico e innovatore.","Gymnopédies, Gnossiennes."],
 ['Sergej Rachmaninov','Rachmaninov','1873–1943','Russia','Strumentale',{h:'bald',hc:'#cfc9bd'},"Pianista virtuoso, ultimo grande romantico.","Concerti per pianoforte n. 2 e 3, Vespri, Vocalise."],
 ['Maurice Ravel','Ravel','1875–1937','Francia','Sinfonica',{h:'slick',hc:'#2a2a2a',b:'sides'},"Maestro dell'orchestrazione.","Boléro, Daphnis et Chloé, Pavane pour une infante défunte."],
 ['Ottorino Respighi','Respighi','1879–1936','Italia','Sinfonica',{h:'slick',hc:'#2a2a2a'},"Bolognese, grande orchestratore.","Le fontane di Roma, I pini di Roma, Antiche arie e danze."],
 ['Igor Stravinskij','Stravinskij','1882–1971','Russia','Sinfonica',{h:'bald',hc:'#cfc9bd',g:1},"Rivoluzionò il ritmo e il balletto.","L'uccello di fuoco, Petruška, La sagra della primavera."],
 ['George Gershwin','Gershwin','1898–1937','USA','Strumentale',{h:'slick',hc:'#2a2a2a'},"Unì jazz e musica colta.","Rhapsody in Blue, Porgy and Bess, Un americano a Parigi."],
 ['Carl Orff','Orff','1895–1982','Germania','Coro',{h:'bald',hc:'#cfc9bd'},"Creò un metodo per educare alla musica.","Carmina Burana."],
 ['Francis Poulenc','Poulenc','1899–1963','Francia','Sacra',{h:'slick',hc:'#3a3027'},"Del «Gruppo dei Sei».","Dialogues des Carmélites, Gloria, Stabat Mater."],
 ['Dmitrij Šostakovič','Šostakovič','1906–1975','Russia','Sinfonica',{h:'side',hc:'#2a2a2a',g:1},"Sinfonista sovietico.","15 sinfonie, 15 quartetti, Valzer n. 2."],
 ['Nino Rota','Rota','1911–1979','Italia','Colonne sonore',{h:'slick',hc:'#3a3027',g:1},"Milanese, musicò i film di Fellini e Il Padrino.","La strada, 8½, Il Padrino, Romeo e Giulietta."],
 ['Benjamin Britten','Britten','1913–1976','Inghilterra','Sacra',{h:'curly',hc:'#4a3a2c'},"Il maggior compositore inglese del Novecento.","Peter Grimes, War Requiem, A Ceremony of Carols."],
 ['Leonard Bernstein','Bernstein','1918–1990','USA','Musical',{h:'short',hc:'#d9d4c8',g:0},"Direttore d'orchestra e compositore.","West Side Story, Candide, Chichester Psalms."],
 ['Ennio Morricone','Morricone','1928–2020','Italia','Colonne sonore',{h:'short',hc:'#e6e2d8',g:1},"Romano, autore di oltre 400 colonne sonore.","C'era una volta il West, Mission, Nuovo Cinema Paradiso."],
 ['Franz Xaver Gruber','Gruber','1787–1863','Austria','Coro',{h:'short',hc:'#8a7a68'},"Maestro di scuola e organista.","Astro del ciel (Stille Nacht)."],
];
// opere e brani: a = titoli riconosciuti, t = titolo, c = compositore, g = genere, y = anno, k = tonalità (solo se certa), p = trama, of = opera di cui fa parte, d = descrizione dell'aria
const K_W=[
 {a:['il barbiere di siviglia','barbiere di siviglia'],t:'Il barbiere di Siviglia',c:'Gioachino Rossini',g:'Opera',y:1816,p:"Il conte d'Almaviva ama la giovane Rosina, tenuta chiusa in casa dal tutore Bartolo che vuole sposarla. Con l'aiuto del barbiere Figaro, tra travestimenti e lettere intercettate, il conte riesce a sposarla."},
 {a:['la cenerentola'],t:'La Cenerentola',c:'Gioachino Rossini',g:'Opera',y:1817,p:"Angelina, maltrattata dal patrigno Don Magnifico e dalle sorellastre, incontra il principe Ramiro travestito da servo. Dopo scambi di ruolo e un braccialetto di riconoscimento, sposa il principe e perdona la famiglia."},
 {a:['litaliana in algeri','italiana in algeri'],t:"L'italiana in Algeri",c:'Gioachino Rossini',g:'Opera',y:1813,p:"Isabella, italiana naufragata ad Algeri, deve sfuggire al bey Mustafà che vuole darla in sposa. Con astuzia libera il fidanzato Lindoro e gli schiavi italiani e torna a casa."},
 {a:['lelisir damore','elisir damore','elisir d amore'],t:"L'elisir d'amore",c:'Gaetano Donizetti',g:'Opera',y:1832,p:"Nemorino, contadino povero, ama la ricca Adina e compra dal ciarlatano Dulcamara un «elisir d'amore» che è solo vino. Quando eredita una fortuna le ragazze lo corteggiano e Adina capisce di amarlo."},
 {a:['lucia di lammermoor'],t:'Lucia di Lammermoor',c:'Gaetano Donizetti',g:'Opera',y:1835,p:"Lucia ama Edgardo, nemico della sua famiglia, ma il fratello Enrico la costringe a sposare Arturo con una lettera falsa. Impazzita, uccide lo sposo la notte delle nozze e muore; Edgardo si toglie la vita."},
 {a:['don pasquale'],t:'Don Pasquale',c:'Gaetano Donizetti',g:'Opera',y:1843,p:"Il vecchio Don Pasquale vuole sposarsi per diseredare il nipote Ernesto; il dottor Malatesta gli presenta «Sofronia», in realtà Norina, amata da Ernesto. Dopo le nozze finte lei diventa insopportabile e Don Pasquale accetta felice le nozze dei giovani."},
 {a:['norma'],t:'Norma',c:'Vincenzo Bellini',g:'Opera',y:1831,p:"Norma, sacerdotessa dei Druidi, ha avuto in segreto due figli dal romano Pollione, che ora ama la giovane Adalgisa. Tradita, medita vendetta ma confessa la propria colpa e sale sul rogo; Pollione, commosso, la raggiunge."},
 {a:['la sonnambula','sonnambula'],t:'La sonnambula',c:'Vincenzo Bellini',g:'Opera',y:1831,p:"Amina, promessa a Elvino, viene vista sonnambula nella camera del conte Rodolfo e creduta infedele. La sua innocenza è provata quando cammina addormentata sul tetto del mulino e Elvino la perdona."},
 {a:['nabucco'],t:'Nabucco',c:'Giuseppe Verdi',g:'Opera',y:1842,p:"Gli Ebrei sono prigionieri a Babilonia. Il re Nabucodonosor, folle di superbia, si proclama dio e viene punito; pentito, riconquista il trono e libera il popolo. Celebre il coro «Va, pensiero»."},
 {a:['macbeth'],t:'Macbeth',c:'Giuseppe Verdi',g:'Opera',y:1847,p:"Spinto dalla moglie e dalla profezia di tre streghe, Macbeth uccide il re Duncan e prende il trono, ma il rimorso e la tirannia lo portano alla rovina; Lady Macbeth impazzisce."},
 {a:['rigoletto'],t:'Rigoletto',c:'Giuseppe Verdi',g:'Opera',y:1851,p:"Il buffone Rigoletto cerca di proteggere la figlia Gilda dal licenzioso duca di Mantova, ma ne è tradito. Per vendetta fa uccidere il duca dal sicario Sparafucile, ma nel sacco trova Gilda, che si è sacrificata per amore."},
 {a:['il trovatore','trovatore'],t:'Il trovatore',c:'Giuseppe Verdi',g:'Opera',y:1853,p:"Manrico, trovatore e figlio adottivo della zingara Azucena, ama Leonora, desiderata anche dal conte di Luna. Manrico viene giustiziato e Azucena rivela al conte che era suo fratello."},
 {a:['la traviata','traviata'],t:'La traviata',c:'Giuseppe Verdi',g:'Opera',y:1853,p:"Violetta, cortigiana parigina, lascia la vita mondana per amore di Alfredo; il padre di lui, Germont, le chiede di rinunciare per salvare l'onore della famiglia. Violetta si sacrifica e muore di tisi tra le braccia di Alfredo, tornato a perdonarla."},
 {a:['un ballo in maschera'],t:'Un ballo in maschera',c:'Giuseppe Verdi',g:'Opera',y:1859,p:"Riccardo, governatore di Boston, ama Amelia, moglie del suo amico Renato. Durante un ballo in maschera Renato lo uccide, ma il governatore morente lo perdona."},
 {a:['la forza del destino','forza del destino'],t:'La forza del destino',c:'Giuseppe Verdi',g:'Opera',y:1862,p:"L'amore di Leonora e Alvaro è ostacolato dal fratello di lei, Carlo, che li insegue per vendetta; un colpo di pistola uccide per caso il padre di Leonora e il destino travolge tutti fino alla morte."},
 {a:['don carlo','don carlos'],t:'Don Carlo',c:'Giuseppe Verdi',g:'Opera',y:1867,p:"L'infante Carlo ama Elisabetta, andata sposa a suo padre Filippo II di Spagna. Tra gli intrighi dell'Inquisizione e l'amicizia con Rodrigo, Carlo è salvato alla fine dal fantasma di Carlo V."},
 {a:['aida'],t:'Aida',c:'Giuseppe Verdi',g:'Opera',y:1871,p:"Aida, schiava etiope, e il capitano egizio Radamès si amano, ma Amneris, figlia del faraone, lo desidera. Radamès, accusato di tradimento, viene murato vivo e Aida lo raggiunge nella tomba."},
 {a:['otello'],t:'Otello',c:'Giuseppe Verdi',g:'Opera',y:1887,p:"Il generale Otello, ingannato dalle insinuazioni di Jago, si convince che la moglie Desdemona lo tradisca. La uccide e, scoperta la verità, si toglie la vita."},
 {a:['falstaff'],t:'Falstaff',c:'Giuseppe Verdi',g:'Opera',y:1893,p:"Il vecchio cavaliere Falstaff tenta di corteggiare due signore, Alice e Meg, che si burlano di lui con un gioco. L'opera si chiude con la fuga «Tutto nel mondo è burla»."},
 {a:['messa da requiem','requiem verdi'],t:'Messa da Requiem',c:'Giuseppe Verdi',g:'Sacra',y:1874,p:"Messa funebre in memoria di Alessandro Manzoni: dal «Dies irae» al «Libera me» alterna pagine drammatiche e di preghiera."},
 {a:['manon lescaut'],t:'Manon Lescaut',c:'Giacomo Puccini',g:'Opera',y:1893,p:"Manon, destinata al convento, fugge con il giovane Des Grieux ma lo lascia per il ricco Geronte. Deportata in America, muore nel deserto tra le braccia di Des Grieux."},
 {a:['la boheme','boheme'],t:'La Bohème',c:'Giacomo Puccini',g:'Opera',y:1896,p:"A Parigi il poeta Rodolfo si innamora della sarta Mimì, malata. Tra amori, litigi e la vita povera ma allegra degli amici bohémien, Mimì torna a morire nella soffitta."},
 {a:['tosca'],t:'Tosca',c:'Giacomo Puccini',g:'Opera',y:1900,p:"La cantante Tosca ama il pittore Cavaradossi, che aiuta un prigioniero politico; il capo della polizia Scarpia lo condanna e offre la salvezza in cambio di Tosca. Lei lo uccide, ma la fucilazione «finta» è vera, e si getta da Castel Sant'Angelo."},
 {a:['madama butterfly','madame butterfly'],t:'Madama Butterfly',c:'Giacomo Puccini',g:'Opera',y:1904,p:"Cio-Cio-San, giovane geisha, sposa l'ufficiale americano Pinkerton, che parte e la abbandona. Dopo anni di attesa lo rivede con la nuova moglie americana, affida loro il figlio e si toglie la vita."},
 {a:['gianni schicchi'],t:'Gianni Schicchi',c:'Giacomo Puccini',g:'Opera',y:1918,p:"Alla morte di Buoso Donati i parenti scoprono che ha lasciato tutto ai frati. Gianni Schicchi si finge Buoso e detta un nuovo testamento a proprio vantaggio, beffando tutti."},
 {a:['turandot'],t:'Turandot',c:'Giacomo Puccini',g:'Opera',y:1926,p:"La principessa Turandot sfida i pretendenti con tre enigmi; il principe ignoto Calaf li risolve e a sua volta le propone di scoprire il suo nome. Il sacrificio della schiava Liù scioglie il cuore della principessa. L'opera, incompiuta, è stata completata da Franco Alfano."},
 {a:['cavalleria rusticana'],t:'Cavalleria rusticana',c:'Pietro Mascagni',g:'Opera',y:1890,p:"In un paese siciliano Turiddu, abbandonato Santuzza, torna dalla ex fidanzata Lola, moglie di Alfio. Santuzza rivela tutto ad Alfio e Turiddu muore in duello."},
 {a:['pagliacci','i pagliacci'],t:'Pagliacci',c:'Ruggero Leoncavallo',g:'Opera',y:1892,p:"Canio, capo di una compagnia di commedianti, scopre il tradimento della moglie Nedda; durante lo spettacolo la finzione si confonde con la realtà e uccide lei e l'amante Silvio."},
 {a:['andrea chenier'],t:'Andrea Chénier',c:'Umberto Giordano',g:'Opera',y:1896,p:"Il poeta Andrea Chénier, durante la Rivoluzione francese, è amato da Maddalena. Condannato alla ghigliottina, lei prende il posto di una condannata per morire con lui."},
 {a:['le nozze di figaro','nozze di figaro'],t:'Le nozze di Figaro',c:'Wolfgang Amadeus Mozart',g:'Opera',y:1786,p:"Il giorno delle nozze, Figaro e Susanna sventano le insidie del conte d'Almaviva, che vorrebbe sedurre la promessa. Tra travestimenti e scambi di persona, la contessa e i servitori riportano il conte al pentimento."},
 {a:['don giovanni'],t:'Don Giovanni',c:'Wolfgang Amadeus Mozart',g:'Opera',y:1787,p:"Il libertino Don Giovanni seduce e inganna donne senza posa e uccide il Commendatore; la statua del morto lo invita a cena e lo trascina all'inferno."},
 {a:['cosi fan tutte'],t:'Così fan tutte',c:'Wolfgang Amadeus Mozart',g:'Opera',y:1790,p:"Due amici scommettono con Don Alfonso sulla fedeltà delle loro fidanzate; travestiti, le corteggiano e ambedue cedono. Tutto si ricompone con la morale «così fan tutte»."},
 {a:['requiem mozart','requiem'],t:'Requiem in re minore K 626',c:'Wolfgang Amadeus Mozart',g:'Sacra',y:1791,k:'Re minore',p:"Ultima opera di Mozart, rimasta incompiuta alla sua morte e completata dall'allievo Süssmayr."},
 {a:['ave verum corpus','ave verum'],t:'Ave verum corpus K 618',c:'Wolfgang Amadeus Mozart',g:'Sacra',y:1791,k:'Re maggiore',p:'Breve mottetto eucaristico per coro, archi e organo.'},
 {a:['eine kleine nachtmusik'],t:'Eine kleine Nachtmusik K 525',c:'Wolfgang Amadeus Mozart',g:'Sinfonica',y:1787,k:'Sol maggiore',p:'Serenata per archi in quattro movimenti.'},
 {a:['lorfeo','orfeo'],t:"L'Orfeo",c:'Claudio Monteverdi',g:'Opera',y:1607,p:"Orfeo scende negli Inferi per riavere Euridice, morta; Caronte e Plutone si commuovono, ma Orfeo si volta a guardarla e la perde per sempre. Apollo lo porta in cielo."},
 {a:['la serva padrona'],t:'La serva padrona',c:'Giovanni Battista Pergolesi',g:'Opera',y:1733,p:"La furba serva Serpina, con un finto fidanzato, convince il padrone Uberto a sposarla."},
 {a:['stabat mater'],t:'Stabat Mater',c:'Giovanni Battista Pergolesi',g:'Sacra',y:1736,k:'Fa minore',p:'Sequenza sul dolore della Vergine ai piedi della croce, per soprano, contralto e archi.'},
 {a:['gloria rv 589','gloria vivaldi'],t:'Gloria RV 589',c:'Antonio Vivaldi',g:'Sacra',k:'Re maggiore',p:'Il più celebre Gloria di Vivaldi, per coro, solisti e orchestra.'},
 {a:['le quattro stagioni','quattro stagioni','primavera vivaldi'],t:'Le quattro stagioni',c:'Antonio Vivaldi',g:'Sinfonica',y:1725,p:'Quattro concerti per violino che descrivono primavera, estate, autunno e inverno.'},
 {a:['hallelujah','alleluia handel','messiah','messia'],t:'Messiah',c:'Georg Friedrich Händel',g:'Sacra',y:1741,p:'Oratorio sulla vita di Cristo; celebre il coro «Hallelujah» (in re maggiore).'},
 {a:['canone in re','canone pachelbel'],t:'Canone in re maggiore',c:'Johann Pachelbel',g:'Strumentale',k:'Re maggiore',p:'Canone per tre violini e basso continuo.'},
 {a:['toccata e fuga','toccata and fugue'],t:'Toccata e fuga BWV 565',c:'Johann Sebastian Bach',g:'Strumentale',k:'Re minore',p:"Celebre pagina per organo, la più famosa di Bach."},
 {a:['messa in si minore','mass in b minor'],t:'Messa in si minore',c:'Johann Sebastian Bach',g:'Sacra',k:'Si minore',p:'Grande messa per coro e orchestra, sintesi dell\'arte di Bach.'},
 {a:['ave maria schubert','ave maria'],t:'Ave Maria',c:'Franz Schubert',g:'Sacra',y:1825,k:'Si bemolle maggiore',p:"Nata come «Ellens dritter Gesang» su un testo di Walter Scott, è poi stata adattata alla preghiera latina."},
 {a:['per elisa','fur elise'],t:'Per Elisa',c:'Ludwig van Beethoven',g:'Strumentale',k:'La minore',p:'Bagatella per pianoforte, la più popolare di Beethoven.'},
 {a:['sonata al chiaro di luna','moonlight sonata'],t:'Sonata «Al chiaro di luna»',c:'Ludwig van Beethoven',g:'Strumentale',k:'Do diesis minore',p:'Sonata per pianoforte op. 27 n. 2.'},
 {a:['clair de lune'],t:'Clair de lune',c:'Claude Debussy',g:'Strumentale',k:'Re bemolle maggiore',p:'Pagina per pianoforte della Suite bergamasque.'},
 {a:['gymnopedie'],t:'Gymnopédie n. 1',c:'Erik Satie',g:'Strumentale',k:'Re maggiore',p:'Lenta pagina per pianoforte.'},
 {a:['stille nacht','astro del ciel'],t:'Astro del ciel (Stille Nacht)',c:'Franz Xaver Gruber',g:'Coro',y:1818,p:'Canto di Natale nato in Austria, per voci e chitarra.'},
 {a:['panis angelicus'],t:'Panis angelicus',c:'César Franck',g:'Sacra',p:'Mottetto eucaristico per tenore, organo, arpa, violoncello e contrabbasso.'},
 // arie
 {a:['largo al factotum'],t:'Largo al factotum',c:'Gioachino Rossini',g:'Opera · aria',of:'Il barbiere di Siviglia',k:'Do maggiore',d:"Cavatina di Figaro, il barbiere factotum della città, che si vanta di essere cercato da tutti."},
 {a:['una voce poco fa'],t:'Una voce poco fa',c:'Gioachino Rossini',g:'Opera · aria',of:'Il barbiere di Siviglia',k:'Mi maggiore',d:"Cavatina di Rosina, che giura di sposare il suo innamorato anche con astuzia."},
 {a:['la calunnia e un venticello','la calunnia'],t:'La calunnia è un venticello',c:'Gioachino Rossini',g:'Opera · aria',of:'Il barbiere di Siviglia',d:"Aria di don Basilio sul potere distruttivo della maldicenza."},
 {a:['non piu mesta'],t:'Non più mesta',c:'Gioachino Rossini',g:'Opera · aria',of:'La Cenerentola',d:"Rondò finale di Angelina, che perdona chi l'ha maltrattata."},
 {a:['una furtiva lagrima','furtiva lagrima'],t:'Una furtiva lagrima',c:'Gaetano Donizetti',g:'Opera · aria',of:"L'elisir d'amore",d:"Romanza di Nemorino, che vede una lacrima di Adina e capisce di essere amato."},
 {a:['casta diva'],t:'Casta diva',c:'Vincenzo Bellini',g:'Opera · aria',of:'Norma',k:'Sol maggiore',d:"Preghiera alla luna di Norma, che invoca la pace."},
 {a:['va pensiero'],t:'Va, pensiero',c:'Giuseppe Verdi',g:'Opera · coro',of:'Nabucco',d:"Coro degli schiavi ebrei che ricordano la patria lontana."},
 {a:['la donna e mobile'],t:'La donna è mobile',c:'Giuseppe Verdi',g:'Opera · aria',of:'Rigoletto',k:'Si bemolle maggiore',d:"Canzone del duca di Mantova sulla volubilità delle donne."},
 {a:['caro nome'],t:'Caro nome',c:'Giuseppe Verdi',g:'Opera · aria',of:'Rigoletto',k:'Mi maggiore',d:"Aria di Gilda, innamorata di un finto studente."},
 {a:['libiamo ne lieti calici','libiamo','brindisi traviata'],t:"Libiamo ne' lieti calici",c:'Giuseppe Verdi',g:'Opera · duetto',of:'La traviata',d:"Brindisi della festa in casa di Violetta, dove Alfredo dichiara il suo amore."},
 {a:['sempre libera'],t:'Sempre libera',c:'Giuseppe Verdi',g:'Opera · aria',of:'La traviata',d:"Aria di Violetta, che rifiuta l'amore per restare libera e mondana."},
 {a:['di quella pira'],t:'Di quella pira',c:'Giuseppe Verdi',g:'Opera · aria',of:'Il trovatore',d:"Cabaletta di Manrico, che corre a salvare la madre dal rogo."},
 {a:['celeste aida'],t:'Celeste Aida',c:'Giuseppe Verdi',g:'Opera · aria',of:'Aida',d:"Romanza di Radamès, che sogna di tornare vincitore e donare ad Aida la gloria."},
 {a:['nessun dorma'],t:'Nessun dorma',c:'Giacomo Puccini',g:'Opera · aria',of:'Turandot',d:"Aria di Calaf, che attende l'alba sicuro di vincere."},
 {a:['o mio babbino caro','mio babbino caro'],t:'O mio babbino caro',c:'Giacomo Puccini',g:'Opera · aria',of:'Gianni Schicchi',k:'La bemolle maggiore',d:"Aria di Lauretta, che supplica il padre di lasciarla sposare Rinuccio."},
 {a:['che gelida manina'],t:'Che gelida manina',c:'Giacomo Puccini',g:'Opera · aria',of:'La Bohème',d:"Aria di Rodolfo che conosce Mimì."},
 {a:['mi chiamano mimi','si mi chiamano mimi'],t:'Mi chiamano Mimì',c:'Giacomo Puccini',g:'Opera · aria',of:'La Bohème',d:"Aria di Mimì, che racconta la sua vita semplice."},
 {a:['o soave fanciulla'],t:'O soave fanciulla',c:'Giacomo Puccini',g:'Opera · duetto',of:'La Bohème',d:"Duetto d'amore di Rodolfo e Mimì."},
 {a:['vissi darte','vissi d arte'],t:"Vissi d'arte",c:'Giacomo Puccini',g:'Opera · aria',of:'Tosca',d:"Preghiera di Tosca, che chiede perché Dio l'abbia ripagata così."},
 {a:['e lucevan le stelle'],t:'E lucevan le stelle',c:'Giacomo Puccini',g:'Opera · aria',of:'Tosca',d:"Ultima aria di Cavaradossi, prima di essere fucilato."},
 {a:['recondita armonia'],t:'Recondita armonia',c:'Giacomo Puccini',g:'Opera · aria',of:'Tosca',d:"Aria di Cavaradossi che confronta Tosca e la donna del suo dipinto."},
 {a:['un bel di vedremo','un bel di'],t:'Un bel dì vedremo',c:'Giacomo Puccini',g:'Opera · aria',of:'Madama Butterfly',d:"Aria di Cio-Cio-San, che immagina il ritorno di Pinkerton."},
 {a:['vesti la giubba'],t:'Vesti la giubba',c:'Ruggero Leoncavallo',g:'Opera · aria',of:'Pagliacci',d:"Lamento di Canio, che deve far ridere il pubblico col cuore spezzato."},
 {a:['intermezzo cavalleria'],t:'Intermezzo',c:'Pietro Mascagni',g:'Opera · intermezzo',of:'Cavalleria rusticana',d:"Pagina orchestrale tra le due scene dell'opera."},
 {a:['voi che sapete'],t:'Voi che sapete',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Le nozze di Figaro',d:"Canzone di Cherubino, che descrive il turbamento d'amore."},
 {a:['non so piu cosa son'],t:'Non so più cosa son',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Le nozze di Figaro',d:"Aria di Cherubino, innamorato di tutte le donne."},
 {a:['porgi amor'],t:'Porgi, amor',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Le nozze di Figaro',d:"Cavatina della contessa, che invoca l'amore perduto del conte."},
 {a:['dove sono'],t:'Dove sono',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Le nozze di Figaro',d:"Aria della contessa, che ricorda i giorni felici."},
 {a:['se vuol ballare'],t:'Se vuol ballare',c:'Wolfgang Amadeus Mozart',g:'Opera · cavatina',of:'Le nozze di Figaro',d:"Cavatina di Figaro, che minaccia il conte."},
 {a:['non piu andrai'],t:'Non più andrai',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Le nozze di Figaro',d:"Aria di Figaro, che prende in giro Cherubino partito soldato."},
 {a:['la ci darem la mano','la ci darem'],t:'Là ci darem la mano',c:'Wolfgang Amadeus Mozart',g:'Opera · duetto',of:'Don Giovanni',d:"Duetto di seduzione tra Don Giovanni e Zerlina."},
 {a:['madamina il catalogo e questo','madamina'],t:'Madamina, il catalogo è questo',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Don Giovanni',d:"Aria di Leporello, con l'elenco delle conquiste del padrone."},
 {a:['deh vieni alla finestra'],t:'Deh vieni alla finestra',c:'Wolfgang Amadeus Mozart',g:'Opera · serenata',of:'Don Giovanni',d:"Serenata di Don Giovanni, che canta sotto la finestra."},
 {a:['come scoglio'],t:'Come scoglio',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Così fan tutte',d:"Aria di Fiordiligi, ferma come uno scoglio nella fedeltà."},
 {a:['soave sia il vento'],t:'Soave sia il vento',c:'Wolfgang Amadeus Mozart',g:'Opera · terzetto',of:'Così fan tutte',d:"Terzetto d'addio, che augura buon viaggio ai fidanzati."},
];

K_COMP.push(
 ['Jules Massenet','Massenet','1842–1912','Francia','Opera',{h:'short',hc:'#d6d0c4',b:'stache'},"Parigino, maestro dell'opera lirica francese di fine Ottocento.","Manon, Werther, Thaïs (Méditation), Cendrillon."],
 ['Sergej Prokofiev','Prokofiev','1891–1953','Russia','Sinfonica',{h:'short',hc:'#6b5a48',g:1},"Pianista e compositore russo, tra Occidente e Unione Sovietica.","Pierino e il lupo, Romeo e Giulietta, Aleksandr Nevskij, Sinfonia classica."],
 ['Charlie Parker','Parker','1920–1955','USA','Jazz',{h:'short',hc:'#222',sk:'#b98562'},"Sassofonista, fondatore del bebop.","Billie's Bounce, Ornithology, Donna Lee, Yardbird Suite."]);
K_W.push(
 {a:['carmen'],t:'Carmen',c:'Georges Bizet',g:'Opera',y:1875,p:"A Siviglia la zingara Carmen seduce il brigadiere Don José, che per lei diserta e si unisce ai contrabbandieri. Quando lei si innamora del torero Escamillo, José, geloso, la uccide davanti all'arena."},
 {a:['habanera carmen','habanera','lamour est un oiseau rebelle'],t:'Habanera',c:'Georges Bizet',g:'Opera · aria',of:'Carmen',d:"«L'amour est un oiseau rebelle»: Carmen proclama che l'amore non obbedisce a nessuna legge."},
 {a:['toreador','votre toast','air du toreador'],t:'Toreador (Couplets)',c:'Georges Bizet',g:'Opera · aria',of:'Carmen',d:"Canto di Escamillo, il torero, che esalta la vita dell'arena."},
 {a:['la fleur que tu mavais jetee','air de la fleur','la fleur que tu m avais jetee'],t:"La fleur que tu m'avais jetée",c:'Georges Bizet',g:'Opera · aria',of:'Carmen',d:"Aria di Don José in prigione, che ricorda il fiore gettatogli da Carmen."},
 {a:['seguidilla'],t:'Seguidilla',c:'Georges Bizet',g:'Opera · aria',of:'Carmen',d:"Carmen convince Don José a lasciarla fuggire promettendogli il suo amore."},
 {a:['manon'],t:'Manon',c:'Jules Massenet',g:'Opera',y:1884,p:"Manon, destinata al convento, fugge a Parigi con il giovane Des Grieux, poi lo lascia per una vita di lusso. Pentita, torna da lui ma muore sfinita sulla strada di Le Havre."},
 {a:['en fermant les yeux','le reve'],t:'En fermant les yeux (Le rêve)',c:'Jules Massenet',g:'Opera · aria',of:'Manon',d:"Des Grieux racconta il sogno di una vita felice con Manon in una piccola casa."},
 {a:['ah fuyez douce image'],t:'Ah! fuyez, douce image',c:'Jules Massenet',g:'Opera · aria',of:'Manon',d:"Des Grieux, deciso a farsi prete, prega l'immagine di Manon di lasciarlo."},
 {a:['il corsaro'],t:'Il corsaro',c:'Giuseppe Verdi',g:'Opera',y:1848,p:"Il pirata Corrado, catturato dal pascià Seid, è liberato dalla schiava Gulnara, che uccide il pascià per amore. Tornato a casa, Corrado trova morta Medora, la sua amata, e si getta in mare."},
 {a:['ernani'],t:'Ernani',c:'Giuseppe Verdi',g:'Opera',y:1844,p:"Il bandito Ernani ama Elvira, promessa al vecchio Silva e desiderata anche dal re Carlo. Giurato di morire al suono di un corno, si uccide proprio alle nozze con Elvira per mantenere la parola."},
 {a:['i vespri siciliani','vespri siciliani'],t:'I vespri siciliani',c:'Giuseppe Verdi',g:'Opera',y:1855,p:"Nella Palermo dominata dai Francesi, Elena e Procida preparano la rivolta. Alle nozze di Elena e Arrigo suona il segnale dei Vespri e i Francesi vengono massacrati."},
 {a:['stride la vampa'],t:'Stride la vampa',c:'Giuseppe Verdi',g:'Opera · aria',of:'Il trovatore',d:"Racconto di Azucena, la zingara, che rivive il rogo della madre."},
 {a:['i capuleti e i montecchi','capuleti e montecchi'],t:'I Capuleti e i Montecchi',c:'Vincenzo Bellini',g:'Opera',y:1830,p:"Giulietta e Romeo, di famiglie nemiche a Verona, si amano; con un finto sonno Giulietta sfugge alle nozze imposte, ma Romeo, credendola morta, si avvelena e lei muore accanto a lui."},
 {a:['i puritani','puritani'],t:'I puritani',c:'Vincenzo Bellini',g:'Opera',y:1835,p:"Elvira, promessa ad Arturo, impazzisce credendosi tradita quando lui fugge con una regina prigioniera; l'amore e il perdono la riportano alla ragione."},
 {a:['ah per sempre io ti perdei','per sempre io ti perdei'],t:'Ah! per sempre io ti perdei',c:'Vincenzo Bellini',g:'Opera · aria',of:'I puritani',d:"Aria di Riccardo, che rimpiange l'amore di Elvira perduto per sempre."},
 {a:['ah non credea mirarti','non credea mirarti'],t:'Ah! non credea mirarti',c:'Vincenzo Bellini',g:'Opera · aria',of:'La sonnambula',d:"Aria finale di Amina, che vede appassito il fiore dell'amore e ritrova la felicità."},
 {a:['la figlia del reggimento','la fille du regiment','fille du regiment'],t:'La figlia del reggimento',c:'Gaetano Donizetti',g:'Opera',y:1840,p:"Marie, cresciuta dai soldati di un reggimento, ama il tirolese Tonio; scoperta di nobile famiglia, deve sposare un altro, ma alla fine vincono l'amore e il reggimento."},
 {a:['come paride vezzoso'],t:'Come Paride vezzoso',c:'Gaetano Donizetti',g:'Opera · cavatina',of:"L'elisir d'amore",d:"Cavatina del sergente Belcore, che si paragona a Paride per conquistare Adina."},
 {a:['il signor bruschino','signor bruschino'],t:'Il signor Bruschino',c:'Gioachino Rossini',g:'Opera',y:1813,p:"Il giovane Florville ama Sofia, destinata al figlio di Bruschino; con uno scambio di persona si finge proprio il figlio Bruschino e ottiene la sua mano."},
 {a:['se il mio nome saper voi bramate','se il mio nome'],t:'Se il mio nome saper voi bramate',c:'Gioachino Rossini',g:'Opera · cavatina',of:'Il barbiere di Siviglia',d:"Serenata del conte d'Almaviva, che sotto la finestra di Rosina si finge il povero Lindoro."},
 {a:['la clemenza di tito','clemenza di tito'],t:'La clemenza di Tito',c:'Wolfgang Amadeus Mozart',g:'Opera',y:1791,p:"L'imperatore Tito perdona Sesto, che per amore di Vitellia ha tramato contro di lui, e rinuncia alla vendetta."},
 {a:['il flauto magico','flauto magico','die zauberflote','zauberflote'],t:'Il flauto magico',c:'Wolfgang Amadeus Mozart',g:'Opera',y:1791,p:"Il principe Tamino, aiutato dal buffo Papageno e da un flauto magico, supera varie prove per liberare Pamina dalla Regina della Notte e unirsi a lei nel tempio di Sarastro."},
 {a:['per pieta ben mio perdona','per pieta ben mio'],t:'Per pietà, ben mio, perdona',c:'Wolfgang Amadeus Mozart',g:'Opera · aria',of:'Così fan tutte',d:"Aria di Fiordiligi, che si pente di aver ceduto al corteggiatore."},
 {a:['che faro senza euridice'],t:'Che farò senza Euridice',c:'Christoph Willibald Gluck',g:'Opera · aria',of:'Orfeo ed Euridice',d:"Lamento di Orfeo, che ha perduto la sposa per la seconda volta."},
 {a:['orfeo ed euridice'],t:'Orfeo ed Euridice',c:'Christoph Willibald Gluck',g:'Opera',y:1762,p:"Orfeo scende agli Inferi per riavere Euridice e commuove le Furie con il canto, ma disobbedendo al divieto di guardarla la perde di nuovo, finché Amore la riporta in vita."},
 {a:['la fanciulla del west','fanciulla del west'],t:'La fanciulla del West',c:'Giacomo Puccini',g:'Opera',y:1910,p:"Nel Far West Minnie, tenutaria del saloon, ama Dick Johnson, in realtà il bandito Ramerrez; lo salva dall'impiccagione e parte con lui."},
 {a:['chella mi creda','ch ella mi creda'],t:"Ch'ella mi creda",c:'Giacomo Puccini',g:'Opera · aria',of:'La fanciulla del West',d:"Aria di Dick Johnson, che chiede di far credere a Minnie che sia libero e lontano."},
 {a:['non tamo piu','non t amo piu'],t:"Non t'amo più",c:'Francesco Paolo Tosti',g:'Lirica da camera',p:"Romanza da camera su versi di Carmelo Errico."},
 {a:['malia'],t:'Malìa',c:'Francesco Paolo Tosti',g:'Lirica da camera',p:"Romanza da camera su versi di Rocco Pagliara."},
 {a:['standchen','serenata schubert'],t:'Ständchen (Serenata)',c:'Franz Schubert',g:'Lirica da camera',k:'Re minore',p:"Lied dalla raccolta Schwanengesang, su versi di Rellstab."},
 {a:['an die musik'],t:'An die Musik',c:'Franz Schubert',g:'Lirica da camera',k:'Re maggiore',p:"Lied di omaggio alla musica, su versi di Franz von Schober."},
 {a:['ein deutsches requiem','deutsches requiem'],t:'Ein deutsches Requiem',c:'Johannes Brahms',g:'Sacra',y:1868,p:"Requiem su testi biblici in tedesco, pensato per consolare i vivi."},
 {a:['carmina burana'],t:'Carmina Burana',c:'Carl Orff',g:'Coro',y:1936,p:"Cantata scenica su testi medievali goliardici: la fortuna, la primavera, la taverna e l'amore."},
 {a:['aleksandr nevskij','alexander nevsky','a nevskij','alexander nevskij'],t:'Aleksandr Nevskij',c:'Sergej Prokofiev',g:'Coro',y:1938,p:"Cantata dalle musiche del film di Ejzenštejn sulla vittoria del principe di Novgorod sui cavalieri teutonici nella battaglia sul ghiaccio (1242)."},
 {a:['symphony of psalms','sinfonia di salmi'],t:'Symphony of Psalms',c:'Igor Stravinskij',g:'Sacra',y:1930,p:"Sinfonia per coro e orchestra su testi dei Salmi."},
 {a:['missa in tempore belli','paukenmesse'],t:'Missa in tempore belli',c:'Franz Joseph Haydn',g:'Sacra',y:1796,k:'Do maggiore',p:"Messa con timpani solisti, composta in tempo di guerra."},
 {a:['la creazione haydn','die schopfung','creazione haydn','la creazione'],t:'La Creazione',c:'Franz Joseph Haydn',g:'Sacra',y:1798,p:"Oratorio sulla creazione del mondo, dalla Genesi e dal Paradiso perduto di Milton."},
 {a:['ave maria gounod','ave maria bach gounod'],t:'Ave Maria (su Bach)',c:'Charles Gounod',g:'Sacra',k:'Do maggiore',p:"Melodia sul Preludio in do maggiore del Clavicembalo ben temperato di Bach."},
 {a:['billies bounce','billie s bounce'],t:"Billie's Bounce",c:'Charlie Parker',g:'Jazz',y:1945,k:'Fa maggiore',p:"Blues di dodici battute in fa, brano simbolo del bebop."},
 {a:['concerto per pianoforte n 21','concerto n 21 mozart'],t:'Concerto per pianoforte n. 21 K 467',c:'Wolfgang Amadeus Mozart',g:'Sinfonica',k:'Do maggiore',p:"Celebre per l'Andante, tema di film."},
 {a:['le quattro stagioni primavera'],t:'La primavera (Le quattro stagioni)',c:'Antonio Vivaldi',g:'Sinfonica',k:'Mi maggiore',p:"Primo concerto delle Quattro stagioni."},
);
// ambigui: titoli che appartengono a più compositori
['ave maria schubert','ave maria','stabat mater','requiem mozart','requiem'].forEach(a=>{ const w=K_W.find(x=>x.a.includes(a)); if(w) w.amb=1; });
(function(){ const w=K_W.find(x=>x.a.includes('requiem')); if(w) w.a=w.a.filter(a=>a!=='requiem'); })();

// sinfonie e concerti: tonalità automatica ("Sinfonia n 5 Beethoven" → Do minore)
const K_ORD={primo:1,prima:1,secondo:2,seconda:2,terzo:3,terza:3,quarto:4,quarta:4,quinto:5,quinta:5,sesto:6,sesta:6,settimo:7,settima:7,ottavo:8,ottava:8,nono:9,nona:9,decimo:10,decima:10};
const K_SYM={beethoven:{1:['Do maggiore'],2:['Re maggiore'],3:['Mi bemolle maggiore','Eroica'],4:['Si bemolle maggiore'],5:['Do minore'],6:['Fa maggiore','Pastorale'],7:['La maggiore'],8:['Fa maggiore'],9:['Re minore','Corale']},
 mozart:{25:['Sol minore'],29:['La maggiore'],35:['Re maggiore','Haffner'],36:['Do maggiore','Linz'],38:['Re maggiore','Praga'],39:['Mi bemolle maggiore'],40:['Sol minore'],41:['Do maggiore','Jupiter']},
 haydn:{94:['Sol maggiore','La sorpresa'],100:['Sol maggiore','Militare'],101:['Re maggiore','L\'orologio'],103:['Mi bemolle maggiore','Rullo di timpani'],104:['Re maggiore','London']},
 schubert:{5:['Si bemolle maggiore'],8:['Si minore','Incompiuta'],9:['Do maggiore','La grande']},
 schumann:{1:['Si bemolle maggiore','Primavera'],2:['Do maggiore'],3:['Mi bemolle maggiore','Renana'],4:['Re minore']},
 mendelssohn:{3:['La minore','Scozzese'],4:['La maggiore','Italiana'],5:['Re maggiore','Riforma']},
 brahms:{1:['Do minore'],2:['Re maggiore'],3:['Fa maggiore'],4:['Mi minore']},
 dvorak:{7:['Re minore'],8:['Sol maggiore'],9:['Mi minore','Dal nuovo mondo']},
 cajkovskij:{4:['Fa minore'],5:['Mi minore'],6:['Si minore','Patetica']},
 bruckner:{4:['Mi bemolle maggiore','Romantica'],7:['Mi maggiore'],8:['Do minore'],9:['Re minore']},
 mahler:{1:['Re maggiore','Il Titano'],2:['Do minore','Resurrezione'],5:['Do diesis minore'],9:['Re maggiore']},
 sostakovic:{5:['Re minore'],7:['Do maggiore','Leningrado'],10:['Mi minore']},
 rachmaninov:{2:['Mi minore']}, 'saint saens':{3:['Do minore','Con organo']}, franck:{1:['Re minore']}, prokofiev:{1:['Re maggiore','Classica'],5:['Si bemolle maggiore']}};
const K_CON={beethoven:{1:'Do maggiore',2:'Si bemolle maggiore',3:'Do minore',4:'Sol maggiore',5:'Mi bemolle maggiore'},mozart:{20:'Re minore',21:'Do maggiore',23:'La maggiore',24:'Do minore',27:'Si bemolle maggiore'},
 rachmaninov:{2:'Do minore',3:'Re minore'},cajkovskij:{1:'Si bemolle minore'},brahms:{1:'Re minore',2:'Si bemolle maggiore'},chopin:{1:'Mi minore',2:'Fa minore'},liszt:{1:'Mi bemolle maggiore',2:'La maggiore'},grieg:{1:'La minore'}};
const K_VLN={beethoven:'Re maggiore',brahms:'Re maggiore',cajkovskij:'Re maggiore',mendelssohn:'Mi minore'};

const K = {
  norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); },
  comp(name){ const n=this.norm(name); if(!n) return null; return this.list.find(c=>c.nf===n)||this.list.find(c=>c.ns===n)||null; },
  search(q){ const n=this.norm(q); if(n.length<2) return []; const out=[];
    this.list.forEach(c=>{ let s=0; if(c.nf.startsWith(n)) s=4; else if(c.nf.split(' ').some(t=>t.startsWith(n))) s=3; else if(n.length>=5&&c.nf.includes(n)) s=1; if(s) out.push([s,c]); });
    return out.sort((a,b)=>b[0]-a[0]||a[1].n.localeCompare(b[1].n)).map(x=>x[1]).slice(0,6); },
  // riconosce un brano dal titolo (anche con il nome del compositore nel nome del file)
  work(title,hint){ const n=this.norm(title); if(n.length<3) return null; const nb=this.numbered(title,hint); if(nb) return nb; let best=null,bs=0;
    for(const w of K_W){ for(const a of w.a){ let s=0; if(n===a) s=100; else if((' '+n+' ').includes(' '+a+' ')&&a.length>=5) s=70+Math.min(20,a.length); else if(a.includes(n)&&n.length>=9) s=55;
        else{ const tw=n.split(' ').filter(x=>x.length>=4), aw=a.split(' ').filter(x=>x.length>=4); const sh=aw.filter(x=>tw.includes(x)).length; if(aw.length>=2&&sh>=2&&sh/aw.length>=.66) s=45+sh; }
        if(s&&w.of&&(' '+n+' ').includes(' '+this.norm(w.of)+' ')) s+=8;   // aria + titolo dell'opera: vince l'aria
        if(s>bs){ bs=s; best=w; } } }
    if(bs<55) return null; const w={...this.full(best),score:bs};
    // titolo ambiguo (Ave Maria, Requiem…): vale solo se compare il compositore
    if(w.amb){ const cc=this.comp(w.c); const ok=cc&&((' '+n+' ').includes(' '+cc.ns+' ')||(hint&&this.norm(hint).includes(cc.ns))); if(!ok) w.score=Math.min(w.score,60); }
    return w; },
  full(w){ const o={...w}; if(w.of){ const par=K_W.find(x=>x.t===w.of); if(par){ o.parent=par; o.p=(w.d?w.d+' ':'')+'Dall\'opera '+par.t+': '+par.p; o.y=o.y||par.y; } } return o; },
  inTitle(title){ const n=' '+this.norm(title)+' '; const c=this.list.find(c=>n.includes(' '+c.ns+' ')&&c.ns.length>=4); return c||null; },
  // cerca una persona su Wikipedia (foto e riassunto), se c'è internet
  async wiki(name){ try{ const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),7000); const r=await fetch('https://it.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(name.replace(/ /g,'_')),{signal:ctl.signal}); clearTimeout(to); if(!r.ok) return null; const j=await r.json(); if(j.type==='disambiguation') return null; return {img:j.thumbnail&&j.thumbnail.source,text:j.extract,desc:j.description}; }catch(e){ return null; } },
  avatar(c,size=56){ const a=(c&&c.av)||{}, sk=a.sk||'#f0c9a4', hc=a.hc||'#5a4630', cl=a.cl||'#2c2a33', bg=a.bg||'#3a2f1d', h=a.h||'short', b=a.b||'';
    let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><rect width="100" height="100" fill="${bg}"/>`;
    const back={wig:`<ellipse cx="50" cy="40" rx="35" ry="33" fill="${hc}"/><circle cx="19" cy="60" r="10" fill="${hc}"/><circle cx="81" cy="60" r="10" fill="${hc}"/><circle cx="17" cy="45" r="9" fill="${hc}"/><circle cx="83" cy="45" r="9" fill="${hc}"/>`,
      long:`<path d="M22 42Q24 8 50 8Q76 8 78 42L84 86Q66 74 70 52L30 52Q34 74 16 86Z" fill="${hc}"/>`,
      wild:`<g fill="${hc}"><circle cx="30" cy="28" r="12"/><circle cx="44" cy="17" r="12"/><circle cx="59" cy="16" r="12"/><circle cx="72" cy="27" r="12"/><circle cx="23" cy="44" r="10"/><circle cx="77" cy="44" r="10"/></g>`,
      curly:`<g fill="${hc}"><circle cx="31" cy="27" r="10"/><circle cx="43" cy="19" r="10"/><circle cx="57" cy="19" r="10"/><circle cx="69" cy="27" r="10"/><circle cx="25" cy="40" r="8"/><circle cx="75" cy="40" r="8"/></g>`}[h]||'';
    s+=back+`<path d="M8 100Q12 76 50 72Q88 76 92 100Z" fill="${cl}"/><path d="M40 73L50 90L60 73Z" fill="#f4efe4"/><rect x="43" y="60" width="14" height="16" fill="${sk}"/>`;
    s+=`<ellipse cx="50" cy="46" rx="21" ry="25" fill="${sk}"/><circle cx="29" cy="48" r="4" fill="${sk}"/><circle cx="71" cy="48" r="4" fill="${sk}"/>`;
    const front={wig:`<path d="M27 38Q50 6 73 38Q50 26 27 38Z" fill="${hc}"/>`,long:`<path d="M28 38Q50 10 72 38Q50 28 28 38Z" fill="${hc}"/>`,wild:`<path d="M27 40Q36 20 50 26Q64 20 73 40Q60 30 50 34Q40 30 27 40Z" fill="${hc}"/>`,curly:`<path d="M28 38Q50 18 72 38Q60 28 50 30Q40 28 28 38Z" fill="${hc}"/>`,
      short:`<path d="M28 42Q28 17 50 17Q72 17 72 42Q62 28 50 30Q38 28 28 42Z" fill="${hc}"/>`,side:`<path d="M28 42Q27 16 52 17Q73 18 72 42Q64 30 44 30Q34 31 28 42Z" fill="${hc}"/><path d="M30 34Q44 22 62 26" stroke="#0003" fill="none"/>`,slick:`<path d="M28 40Q28 15 50 15Q72 15 72 40Q60 24 50 24Q40 24 28 40Z" fill="${hc}"/>`,bald:`<circle cx="27" cy="44" r="6" fill="${hc}"/><circle cx="73" cy="44" r="6" fill="${hc}"/>`}[h]||'';
    s+=front+`<circle cx="42" cy="46" r="2" fill="#2a1d12"/><circle cx="58" cy="46" r="2" fill="#2a1d12"/><path d="M37 41L46 40M54 40L63 41" stroke="${h==='bald'||h==='wig'?'#8a7a68':hc}" stroke-width="2" fill="none"/><path d="M50 48L47 56L52 56" stroke="#0004" fill="none"/>`;
    if(b==='full') s+=`<path d="M29 50Q30 80 50 82Q70 80 71 50Q66 63 50 63Q34 63 29 50Z" fill="${hc}"/>`; if(b==='stache'||b==='full') s+=`<path d="M38 57Q50 52 62 57Q50 60 38 57Z" fill="${hc}"/>`; if(b==='goatee') s+=`<ellipse cx="50" cy="70" rx="6" ry="7" fill="${hc}"/>`; if(b==='sides') s+=`<path d="M29 40Q27 56 33 62L33 48Z M71 40Q73 56 67 62L67 48Z" fill="${hc}"/>`;
    s+=`<path d="M43 66Q50 70 57 66" stroke="${b==='full'||b==='stache'?'#f4efe4':'#7a3b2c'}" stroke-width="2" fill="none"/>`;
    if(a.g) s+=`<g stroke="#1b1b1b" stroke-width="1.6" fill="#fff3"><circle cx="42" cy="46" r="7"/><circle cx="58" cy="46" r="7"/><path d="M49 46Q50 44 51 46" fill="none"/></g>`;
    return s+'</svg>'; },
  // numero scritto come cifra o come parola ("quinta")
  numIn(n){ const m=n.match(/\b(?:n|no|nr|num|numero|op)?\s*(\d{1,3})\b/); if(m) return +m[1]; for(const w of n.split(' ')) if(K_ORD[w]) return K_ORD[w]; return 0; },
  // sinfonie e concerti con numero: compositore dal titolo o dal campo compositore
  numbered(title,hint){ const n=this.norm(title); const sym=/\b(sinfonia|symphony|sinf|symph|sym)\b/.test(n), con=/\b(concerto|concerti|concert|konzert)\b/.test(n); if(!sym&&!con) return null;
    const c=this.inTitle(title)||this.comp(hint)||(hint&&hint.length>2?this.search(hint)[0]:null); if(!c) return null; const num=this.numIn(n);
    if(sym){ const e=this.symTab[c.ns]&&this.symTab[c.ns][num]; if(!e) return null; return {t:`Sinfonia n. ${num} in ${e[0].toLowerCase()}${e[1]?' «'+e[1]+'»':''}`,c:c.n,g:'Sinfonica',k:e[0],p:'',a:['sinfonia'],score:92,gen:1}; }
    const solo=/\b(violino|violin)\b/.test(n);
    if(solo&&this.vlnTab[c.ns]) return {t:`Concerto per violino in ${this.vlnTab[c.ns].toLowerCase()}`,c:c.n,g:'Sinfonica',k:this.vlnTab[c.ns],p:'',a:['concerto'],score:90,gen:1};
    const k=this.conTab[c.ns]&&this.conTab[c.ns][num]; if(k) return {t:`Concerto per pianoforte n. ${num} in ${k.toLowerCase()}`,c:c.n,g:'Sinfonica',k,p:'',a:['concerto'],score:90,gen:1}; return null; },
  // parole del titolo che il riconoscimento non spiega (se non ne restano, il titolo ufficiale si scrive da solo)
  residual(title,w){ const stop=new Set(['sp','coro','uomini','uomo','donne','voci','gravi','spartito','partitura','pdf','copia','copy','ok','vocal','score','solo','piano','canto','e','di','da','del','della','dell','atto','atti','i','ii','iii','iv','v','n','no','op','il','lo','la','le','un','una','arie','aria','parte','parti','sinf','sinfonia','symphony','concerto']);
    const known=new Set([...this.norm(w.c).split(' '),...(w.a||[]).flatMap(a=>a.split(' ')),...this.norm(w.t).split(' '),...this.norm(w.of||'').split(' ')]);
    return this.norm(title).split(' ').filter(x=>x&&!stop.has(x)&&!known.has(x)&&!/^\d{1,3}$/.test(x)); },
  // titolo ufficiale, se il titolo scritto è solo una variante (altrimenti null)
  officialTitle(title,w){ if(!w||w.score<85||w.amb) return null; if(this.norm(title)===this.norm(w.t)) return null; if(/\d/.test(this.norm(title).replace(/\b\d{1,3}\b/g,m=>w.gen?'':m))&&!w.gen) return null; return this.residual(title,w).length?null:w.t; },
  // disegno del volto come immagine (per i segni sulla pagina e per le icone piccole)
  avCache:new Map(),
  avImage(c){ let e=this.avCache.get(c.n); if(e) return e; e={ready:false,cv:null}; this.avCache.set(c.n,e); const im=new Image(); im.onload=()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; cv.getContext('2d').drawImage(im,0,0,128,128); e.cv=cv; e.ready=true; try{ Anno.redraw(); }catch(err){} }; im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(this.avatar(c,128)); return e; },
  preloadAvatars(){ this.list.forEach(c=>this.avImage(c)); },
  // piccola icona del compositore (elenco spartiti, barra del titolo)
  find(name){ if(!name) return null; const c=this.comp(name); if(c) return c; const l=this.search(String(name).replace(/^[A-Z]\.\s*/,'')); return l.length===1?l[0]:null; },
  badge(name,size=20){ const c=this.find(name); return c?`<span class="kBadge" title="${esc(c.n)}">${this.avatar(c,size)}</span>`:''; },
  init(){ this.symTab={}; this.conTab={}; this.vlnTab={}; Object.entries(K_SYM).forEach(([k,v])=>{ this.symTab[this.norm(k)]=v; }); Object.entries(K_CON).forEach(([k,v])=>{ this.conTab[this.norm(k)]=v; }); Object.entries(K_VLN).forEach(([k,v])=>{ this.vlnTab[this.norm(k)]=v; }); this.list=K_COMP.map(r=>({n:r[0],ns:this.norm(r[1]),nf:this.norm(r[0]),s:r[1],y:r[2],c:r[3],g:r[4],av:r[5],bio:r[6],w:r[7]})); },
  // compila i campi vuoti di uno spartito quando il titolo è riconosciuto
  autofill(sc){ const w=this.work(sc.title+' '+(sc.file||''),sc.composer); let ch=false; if(w&&w.score>=70){ if(!sc.composer){ sc.composer=w.c; ch=true; } if(!sc.genre){ sc.genre=w.g; ch=true; } if(!sc.key&&w.k){ sc.key=w.k; ch=true; } if(w.p) sc.about=sc.about||{work:w.t,plot:w.p};
      if(!sc.fsMeta){ const ot=this.officialTitle(sc.title,w); if(ot){ sc.title0=sc.title0||sc.title; sc.title=ot; ch=true; } } }
    else { const c=this.inTitle(sc.title+' '+(sc.file||'')); if(c&&!sc.composer){ sc.composer=c.n; ch=true; if(!sc.genre){ sc.genre=c.g; } } } return ch; },
};
K.init();
// volti dei compositori tra i segni (categoria Emoticon)
(function(){ const cat=STAMP_CATS.find(c=>c.id==='emoji'); if(cat) K.list.forEach(c=>cat.items.push({v:'cp:'+c.n,n:c.s})); setTimeout(()=>K.preloadAvatars(),1200); })();
function drawComposer(c,name,s){ const k=K.comp(name); const e=k&&K.avImage(k); const r=s*.5; c.save(); c.beginPath(); c.arc(0,0,r,0,7); c.clip();
  if(e&&e.ready) c.drawImage(e.cv,-r,-r,s,s); else { c.fillStyle='#3a2f1d'; c.fillRect(-r,-r,s,s); } c.restore(); c.save(); c.lineWidth=Math.max(1,s*.04); c.strokeStyle='#c8962e'; c.beginPath(); c.arc(0,0,r,0,7); c.stroke(); c.restore(); }
(function(){ const a0=addScore; addScore=async function(){ const sc=await a0.apply(this,arguments); try{ if(K.autofill(sc)) await DB.putScore(sc); }catch(e){} return sc; }; })();

// ---------- Scheda "Informazioni" ----------
editInfo=function(sc,over){
  if(!sc) return toast('Apri prima uno spartito');
  over=over||{}; const val=(k,d)=>over[k]!==undefined?over[k]:d;
  const m2=modal('Informazioni',`
    <div class="field"><label for="iTitle">Titolo</label><input id="iTitle" value="${esc(val('title',sc.title))}" autocomplete="off"></div>
    <div id="iWork" class="kWork" hidden></div>
    <div class="field" style="position:relative"><label for="iComp">Compositore <small style="font-weight:500;color:var(--muted)">— scrivi le prime lettere</small></label><input id="iComp" value="${esc(val('composer',sc.composer))}" autocomplete="off" autocapitalize="words"><div id="iSug" class="kSug" hidden></div></div>
    <div id="iCard"></div>
    <div class="grid2"><div class="field"><label for="iGenre">Genere</label><input id="iGenre" value="${esc(val('genre',sc.genre))}" list="genreList"></div>
    <div class="field"><label for="iKey">Tonalità</label><input id="iKey" value="${esc(val('key',sc.key||''))}" placeholder="es. Sol maggiore" list="keyList"></div></div>
    <div class="field"><label for="iTags">Etichette (separate da virgola)</label><input id="iTags" value="${esc(val('tags',(sc.tags||[]).join(', ')))}" placeholder="coro, uomini, Barbiere"></div>
    <div><button class="ghostBtn" id="iFam">${iconSvg('star')}Compositori famosi</button></div>
    <div id="iPlot"></div>
    <div class="hint">${sc.pages} pagine · aggiunto il ${new Date(sc.added).toLocaleDateString('it-IT')}</div>
    <datalist id="genreList">${[...new Set(['Opera','Opera · aria','Coro','Sacra','Lirica da camera','Sinfonica','Strumentale','Musical','Colonne sonore',...ST.scores.map(s=>s.genre).filter(Boolean)])].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
    <datalist id="keyList">${Object.values(CR_KEYS).map(k=>k.split(' · ')[0]).concat(Object.values(CR_KEYS).map(k=>k.split(' · ')[1])).map(c=>`<option value="${esc(c)}">`).join('')}</datalist>`,
    `<button class="ghostBtn danger" id="iDel">${iconSvg('trash')}Elimina</button><span style="flex:1"></span><button class="ghostBtn" data-close2>Annulla</button><button class="goldBtn" id="iSave">${iconSvg('check')}Salva</button>`,{eyebrow:sc.title});
  let about=sc.about||null; const T=$('#iTitle'), C=$('#iComp'), G=$('#iGenre'), Kk=$('#iKey');
  const card=async name=>{ const box=$('#iCard'); const c=K.comp(name); const photo=c?null:null;
    if(!name.trim()){ box.innerHTML=''; return; }
    const known=c; box.innerHTML=`<div class="kCard"><div class="kAv" id="kAv">${K.avatar(known||{av:{h:'short'}},64)}</div><div class="kTx"><b>${esc(known?known.n:name)}</b><small>${known?esc(known.y+' · '+known.c):'cerco su Wikipedia…'}</small>${known?`<p>${esc(known.bio)}</p><p><b>Ha composto:</b> ${esc(known.w)}</p>`:''}<p id="kWiki" class="kWiki"></p></div></div>`;
    const my=name; const w=await K.wiki(known?known.n:name); if(C.value!==my&&$('#iCard')===null) return; if(!$('#kAv')) return;
    if(w){ if(w.img) $('#kAv').innerHTML=`<img src="${esc(w.img)}" alt="${esc(name)}" referrerpolicy="no-referrer">`; const t=(w.text||'').slice(0,known?330:520); if(!known){ box.querySelector('small').textContent=w.desc||''; }
      if(t&&$('#kWiki')) $('#kWiki').textContent=(known?'Da Wikipedia: ':'')+t+(w.text&&w.text.length>t.length?'…':''); }
    else if(!known&&box.querySelector('small')) box.querySelector('small').textContent='non trovo notizie (serve internet)'; };
  const setComp=c=>{ C.value=c.n; $('#iSug').hidden=true; if(!G.value.trim()) G.value=c.g; card(c.n); };
  const sug=()=>{ const box=$('#iSug'), q=C.value; const list=q.length>=2&&!K.comp(q)?K.search(q):[]; if(!list.length){ box.hidden=true; return; }
    box.innerHTML=list.map(c=>`<button data-n="${esc(c.n)}"><span class="kAvS">${K.avatar(c,36)}</span><span><b>${esc(c.n)}</b><small>${esc(c.y)} · ${esc(c.c)}</small></span></button>`).join(''); box.hidden=false; };
  C.addEventListener('input',e=>{ sug(); // completamento: se il testo è l'inizio del nome intero, completa e lascia selezionato il resto
    if(e.inputType&&e.inputType.startsWith('insert')){ const l=K.search(C.value); const f=l.find(c=>c.n.toLowerCase().startsWith(C.value.toLowerCase())); if(f&&f.n.length>C.value.length&&K.search(C.value).filter(c=>c.n.toLowerCase().startsWith(C.value.toLowerCase())).length===1){ const t=C.value.length; C.value=f.n; C.setSelectionRange(t,f.n.length); } } });
  $('#iSug').onpointerdown=e=>{ const b=e.target.closest('[data-n]'); if(!b) return; e.preventDefault(); setComp(K.comp(b.dataset.n)); };
  const doneComp=()=>{ const c=K.comp(C.value)||(K.search(C.value).length===1?K.search(C.value)[0]:null); if(c) setComp(c); else { $('#iSug').hidden=true; if(C.value.trim().length>3) card(C.value.trim()); } };
  C.addEventListener('change',doneComp); C.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); doneComp(); } });
  C.addEventListener('blur',()=>setTimeout(()=>{ $('#iSug')&&($('#iSug').hidden=true); },150));
  // titolo → brano riconosciuto
  const recognize=(auto)=>{ const box=$('#iWork'); if(!box) return; const w=K.work(T.value,C.value); if(!w){ box.hidden=true; $('#iPlot').innerHTML=about&&about.plot?`<div class="kPlot"><b>${esc(about.work||'Trama')}</b><p>${esc(about.plot)}</p></div>`:''; return; }
    box.hidden=false; box.innerHTML=`<span>🎼 Riconosciuto: <b>${esc(w.t)}</b> · ${esc(w.c)} · ${esc(w.g)}${w.y?' · '+w.y:''}${w.k?' · '+esc(w.k):''}</span><button class="ghostBtn" id="iApply">Applica</button>`;
    $('#iApply').onclick=()=>{ C.value=w.c; G.value=w.g; if(w.k) Kk.value=w.k; T.value=w.t; if(w.p) about={work:w.t,plot:w.p}; const cc=K.comp(w.c); if(cc) card(cc.n); toast('Compilato',1200); };
    // compila da solo i campi vuoti
    if(auto&&w.score>=70){ if(!C.value.trim()){ C.value=w.c; const cc=K.comp(w.c); if(cc) card(cc.n); } if(!G.value.trim()) G.value=w.g; if(!Kk.value.trim()&&w.k) Kk.value=w.k; if(w.p) about={work:w.t,plot:w.p};
      const ot=K.officialTitle(T.value,w); if(ot){ sc.title0=sc.title0||T.value; T.value=ot; toast('Titolo riconosciuto: '+ot,1800); } }
    $('#iPlot').innerHTML=`<div class="kPlot"><b>${w.g.startsWith('Opera')&&!w.of?'Trama':w.of?'Il brano · dall\'opera «'+esc(w.of)+'»':'Il brano'}</b><p>${esc(w.p||'')}</p></div>`; if(!about||about.work!==w.t) about={work:w.t,plot:w.p}; };
  T.addEventListener('change',()=>recognize(true)); C.addEventListener('change',()=>setTimeout(()=>recognize(true),50)); T.addEventListener('input',debounce(()=>recognize(false),500));
  recognize(true); if(C.value.trim()) card(C.value.trim());
  $('#iFam').onclick=()=>{ const snap={title:T.value,composer:C.value,genre:G.value,key:Kk.value,tags:$('#iTags').value};
    const g=modal('Compositori famosi',`<label class="search" style="margin-bottom:10px"><svg class="i" data-i="search"></svg><input id="kfQ" type="search" placeholder="Cerca un compositore…" autocomplete="off"></label><div class="kGrid" id="kfG"></div>`,null,{eyebrow:'Tocca per scegliere'});
    const draw=q=>{ const n=K.norm(q); $('#kfG').innerHTML=K.list.filter(c=>!n||c.nf.includes(n)||c.ns.includes(n)).map(c=>`<button data-n="${esc(c.n)}">${K.avatar(c,64)}<b>${esc(c.s)}</b><small>${esc(c.y)}</small></button>`).join('')||'<div class="hint">Nessun risultato.</div>'; };
    draw(''); hydrateIcons(g); $('#kfQ').oninput=e=>draw(e.target.value);
    $('#kfG').onclick=e=>{ const b=e.target.closest('[data-n]'); if(!b) return; const c=K.comp(b.dataset.n); closeLayers(); editInfo(sc,{...snap,composer:c.n,genre:snap.genre||c.g}); }; };
  m2.querySelector('[data-close2]').onclick=closeLayers;
  m2.querySelector('#iSave').onclick=()=>{ sc.title=T.value.trim()||'Senza titolo'; sc.composer=C.value.trim(); sc.genre=G.value.trim(); sc.key=Kk.value.trim(); sc.tags=$('#iTags').value.split(',').map(s=>s.trim()).filter(Boolean); if(about) sc.about=about; DB.putScore(sc); closeLayers(); renderLibrary(); updateChrome(); toast('Salvato'); };
  m2.querySelector('#iDel').onclick=()=>confirmBox('Eliminare “'+sc.title+'”?','Lo spartito e le sue annotazioni verranno cancellati.','Elimina',async()=>{ await DB.delScore(sc.id); DB.del('ann:'+sc.id); DB.del('bak:'+sc.id); ST.scores=ST.scores.filter(s=>s!==sc); ST.setlists.forEach(s=>s.items=s.items.filter(x=>x!==sc.id)); saveSetlists(); if(ST.cur===sc){ ST.cur=null; if(ST.scores[0]) openScore(ST.scores[0].id); else { pageWrap.hidden=true; $('#loading').hidden=false; } } closeLayers(); renderLibrary(); toast('Eliminato'); });
};

// icona del compositore riconosciuto nella barra del titolo
(function(){ const u0=updateChrome; let orig=null; updateChrome=function(){ const r=u0.apply(this,arguments); try{ const d=$('.brandDot'); if(d){ if(orig===null) orig=d.innerHTML; const c=ST.cur&&K.find(ST.cur.composer); d.innerHTML=c?K.avatar(c,34):orig; d.title=c?c.n:''; } }catch(e){} return r; }; })();
