/* Angel Investigation: assistente virtuale della chat.
 * Apre la conversazione con frasi di cortesia, fa poche domande
 * e alla fine invita a scrivere all'indirizzo email dell'agenzia. */
(() => {
  const EMAIL = 'angelinvestigation07@libero.it';

  const hour = new Date().getHours();
  const saluto = hour >= 5 && hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  const services = [
    [/tradi|infedel|partner|moglie|marito|fidanzat|compagn|amante/i,
      'Mi dispiace, sono situazioni molto delicate. Ci occupiamo spesso di verifiche sulla fedeltà del partner, sempre con la massima discrezione.'],
    [/aziend|dipendent|socio|soci\b|concorren|assenteis|\b104\b|malattia|impresa|ditta/i,
      'Le indagini aziendali sono una delle nostre specialità: dipendenti infedeli, assenteismo, concorrenza sleale e tutela del patrimonio.'],
    [/microspi|\bspia|spiat|gps|bonific|intercett|localizzator|ascolt/i,
      'Capisco la preoccupazione. Effettuiamo bonifiche su ambienti, automobili, computer e smartphone per individuare microspie e localizzatori.'],
    [/rintracc|ritrovar|trovare|scompars|debitor|eredi|irreperibil/i,
      'Ci occupiamo regolarmente di rintraccio persone, sempre nel pieno rispetto della legge.'],
    [/figli|minor|ragazz|droga|sostanz|frequentazion|affidament/i,
      'La tutela dei figli è un tema importantissimo: lo affrontiamo con grande attenzione e delicatezza.'],
    [/avvocat|process|difensiv|tribunal|causa|giudizi/i,
      'Collaboriamo spesso con gli avvocati nelle indagini difensive e nella raccolta di prove utilizzabili in giudizio.'],
  ];

  const isGreeting = (t) => /^\s*(ciao|salve|buongiorno|buonasera|buon pomeriggio|hey|ehi|hello|hi)\b[\s!.,]*$/i.test(t);
  const isThanks = (t) => /grazie|arrivederci|a presto|ciao ciao|buona giornata|buona serata/i.test(t);
  const isPrice = (t) => /cost|prezz|quanto (viene|si spende)|preventiv|tariff|pagare|€|euro/i.test(t);
  const isPhone = (t) => /numero di telefono|vostro (numero|telefono)|posso chiamar|chiamarvi|vi chiamo|telefonarvi|whatsapp/i.test(t);
  const service = (t) => (services.find(([re]) => re.test(t)) || [])[1];

  const finale = (intro) => ({
    text: (intro ? intro + ' ' : '') +
      `Per proseguire in modo riservato le chiedo di scriverci una email all'indirizzo ${EMAIL}, raccontando brevemente il caso. ` +
      'Un investigatore le risponderà personalmente entro 24 ore.',
    final: true,
  });

  let usedService = null;

  window.AngelBot = {
    EMAIL,

    greeting() {
      return {
        text: `${saluto} e benvenuto! Sono Angel, l'assistente virtuale di Angel Investigation. ` +
          'Può scrivermi in totale tranquillità, anche senza dirmi il suo nome. Come posso esserle utile?',
      };
    },

    /** turn = numero di messaggi del visitatore, compreso questo; done = finale già inviato */
    reply(text, turn, done) {
      if (done) {
        if (isThanks(text)) return { text: 'Grazie a lei. Le auguro una buona giornata: restiamo a disposizione.' };
        return { text: `Per qualsiasi altra informazione ci scriva pure a ${EMAIL}. Le risponderemo al più presto.`, final: true };
      }
      if (isPhone(text)) {
        return finale('Per tutelare la riservatezza di entrambi, il numero di telefono viene comunicato dopo la prima consulenza.');
      }
      if (isPrice(text)) {
        return finale('I costi dipendono dal tipo di indagine, dalla durata e dalle risorse necessarie. Il preventivo è sempre gratuito e senza impegno.');
      }
      if (isThanks(text) && turn > 1) {
        return finale('La ringrazio per la fiducia.');
      }

      let s = service(text);
      if (s && s === usedService) s = null; // non ripetere la stessa frase
      if (s) usedService = s;
      if (turn === 1) {
        if (isGreeting(text)) {
          return { text: `${saluto} a lei! Mi fa piacere sentirla. Mi racconti pure, senza fretta: di che tipo di situazione si tratta?` };
        }
        if (s) return { text: s + ' Posso chiederle se la questione riguarda lei personalmente o un\'azienda?' };
        return { text: 'La ringrazio per averci scritto. Per capire meglio come aiutarla: la questione riguarda lei personalmente, un familiare o un\'azienda?' };
      }
      if (turn === 2) {
        const intro = s || 'Capisco, grazie per avermelo spiegato.';
        return { text: intro + ' Ogni caso viene seguito con calma e metodo. Da quanto tempo va avanti questa situazione?' };
      }
      return finale('Grazie, le informazioni che mi ha dato sono molto utili.');
    },
  };
})();
