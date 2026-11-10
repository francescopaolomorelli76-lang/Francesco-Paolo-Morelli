import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../languages.dart';
import 'prefs.dart';

/// Un telefono trovato nelle vicinanze.
class Peer {
  Peer(this.id);

  /// Nome visibile, es. "Manga Vox 482 🇮🇹".
  final String id;
  String state = 'found';

  String get code => RegExp(r'\d{3}').firstMatch(id)?.group(0) ?? '???';
  String get flag => id.split(' ').last;
}

/// Collegamento diretto tra due iPhone con Manga Vox, senza internet.
/// Ognuno parla col suo pulsante IO nelle sue cuffie: le parole viaggiano
/// come testo all'altro telefono, che le traduce nella lingua del suo
/// proprietario e le legge nelle sue cuffie.
///
/// Messaggi (JSON):
/// - {"t":"hello","lang":"it"}                   lingua del proprietario
/// - {"t":"partial","lang":"it","text":"..."}    parole mentre si parla
/// - {"t":"msg","lang":"it","text":"...","g":"male|female"}  frase finita
class PeerLink {
  PeerLink._() {
    if (supported) {
      _events.receiveBroadcastStream().listen(_onEvent, onError: (_) {});
    }
  }
  static final PeerLink instance = PeerLink._();

  static const _ch = MethodChannel('manga_vox/peer');
  static const _events = EventChannel('manga_vox/peer_events');

  /// Per ora solo iPhone con iPhone.
  static bool get supported => Platform.isIOS;

  /// Telefoni trovati vicino (schermata di collegamento).
  final ValueNotifier<List<Peer>> nearby = ValueNotifier(const []);

  /// Telefono collegato (null = nessuno).
  final ValueNotifier<Peer?> connected = ValueNotifier(null);

  /// Lingua del proprietario dell'altro telefono.
  final ValueNotifier<Lang?> partnerLang = ValueNotifier(null);

  final _messages = StreamController<Map<String, dynamic>>.broadcast();

  /// Messaggi ricevuti dall'altro telefono.
  Stream<Map<String, dynamic>> get messages => _messages.stream;

  final Map<String, Peer> _peers = {};
  Lang _mine = Lang.it;

  /// Codice di 3 cifre di questo telefono, per riconoscerlo nell'elenco dell'altro.
  String get myCode {
    var c = Prefs.str('peer_code');
    if (c.isEmpty) {
      c = (100 + math.Random().nextInt(900)).toString();
      Prefs.setStr('peer_code', c);
    }
    return c;
  }

  String _name(Lang mine) => 'Manga Vox $myCode ${mine.flag}';

  /// Apre la ricerca: questo telefono si fa trovare e cerca gli altri.
  Future<bool> startDiscovery(Lang mine) async {
    if (!supported) return false;
    _mine = mine;
    _peers.removeWhere((_, p) => p.state != 'connected');
    _publish();
    try {
      return await _ch.invokeMethod<bool>('start', {'name': _name(mine)}) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Chiude la ricerca (resta collegato se già collegato).
  Future<void> stopDiscovery() async {
    if (!supported) return;
    try {
      await _ch.invokeMethod('stopDiscovery');
    } catch (_) {}
    _peers.removeWhere((_, p) => p.state == 'found' || p.state == 'disconnected');
    _publish();
  }

  Future<void> invite(Peer p) async {
    p.state = 'connecting';
    _publish();
    try {
      await _ch.invokeMethod('invite', {'id': p.id});
    } catch (_) {}
  }

  Future<void> disconnect() async {
    try {
      await _ch.invokeMethod('stop');
    } catch (_) {}
    _peers.clear();
    connected.value = null;
    partnerLang.value = null;
    _publish();
  }

  Future<void> _send(Map<String, dynamic> m, {bool reliable = true}) async {
    if (connected.value == null) return;
    try {
      await _ch.invokeMethod('send', {'data': jsonEncode(m), 'reliable': reliable});
    } catch (_) {}
  }

  /// Comunica all'altro telefono la mia lingua.
  Future<void> sayHello(Lang mine) {
    _mine = mine;
    return _send({'t': 'hello', 'lang': mine.name});
  }

  Future<void> sendPartial(String text) => _send({'t': 'partial', 'lang': _mine.name, 'text': text}, reliable: false);

  Future<void> sendMessage(String text, {String? gender}) =>
      _send({'t': 'msg', 'lang': _mine.name, 'text': text, 'g': ?gender});

  void _onEvent(dynamic e) {
    if (e is! Map) return;
    final type = e['type'];
    final id = '${e['id'] ?? ''}';
    if (id.isEmpty) return;
    switch (type) {
      case 'found':
        _peers.putIfAbsent(id, () => Peer(id));
      case 'lost':
        if (_peers[id]?.state != 'connected') _peers.remove(id);
      case 'state':
        final p = _peers.putIfAbsent(id, () => Peer(id));
        p.state = '${e['state']}';
        if (p.state == 'connected') {
          connected.value = p;
          sayHello(_mine);
        } else if (p.state == 'disconnected' && connected.value?.id == id) {
          connected.value = null;
          partnerLang.value = null;
        }
      case 'data':
        try {
          final m = Map<String, dynamic>.from(jsonDecode('${e['data']}') as Map);
          final l = Lang.fromCode('${m['lang'] ?? ''}');
          if (l != null) partnerLang.value = l;
          _messages.add(m);
        } catch (_) {}
    }
    _publish();
  }

  void _publish() => nearby.value = _peers.values.toList();
}
