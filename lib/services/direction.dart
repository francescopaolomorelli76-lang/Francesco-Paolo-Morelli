import '../languages.dart';

/// Decide in che lingua tradurre, senza che l'utente scelga nulla:
/// - se parlo nella MIA lingua → traduco nella lingua dell'interlocutore;
/// - se sento un'altra lingua → quella diventa la lingua dell'interlocutore
///   e traduco nella MIA lingua.
class Direction {
  Direction({required this.mine, required this.partner});

  Lang mine;
  Lang partner;

  /// Restituisce (da, a) per un testo nella lingua [detected].
  (Lang from, Lang to) route(Lang detected) {
    if (detected == mine) {
      if (partner == mine) partner = mine == Lang.en ? Lang.it : Lang.en;
      return (mine, partner);
    }
    partner = detected;
    return (detected, mine);
  }
}

extension DirectionPeek on Direction {
  /// Come [route] ma senza aggiornare l'interlocutore (per lo scanner dal vivo).
  Lang targetFor(Lang detected) =>
      detected == mine ? (partner == mine ? (mine == Lang.en ? Lang.it : Lang.en) : partner) : mine;
}
