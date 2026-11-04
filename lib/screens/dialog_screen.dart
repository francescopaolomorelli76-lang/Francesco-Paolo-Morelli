import 'package:flutter/material.dart';

import '../languages.dart';
import '../services/prefs.dart';
import '../services/translator_service.dart';
import '../services/voice_service.dart';
import '../ui/manga.dart';
import 'languages_screen.dart';

/// Dialogo tra due persone: il telefono sta sul tavolo, metà schermo
/// per ciascuno (la metà in alto è capovolta per chi sta di fronte).
/// Un tocco sul pulsante → parla → l'app traduce e legge ad alta voce.
class DialogScreen extends StatefulWidget {
  const DialogScreen({super.key});

  @override
  State<DialogScreen> createState() => _DialogScreenState();
}

enum _Side { me, you }

class _Message {
  _Message(this.from, this.original, this.translated);
  final _Side from;
  final String original;
  final String translated;
}

class _DialogScreenState extends State<DialogScreen> {
  final _voice = VoiceService.instance;
  final _tr = TranslatorService.instance;

  late Lang _myLang = Prefs.get('dlg_me', Lang.it);
  late Lang _yourLang = Prefs.get('dlg_you', Lang.en);
  late bool _faceToFace = Prefs.flag('dlg_face', fallback: true);

  _Side? _listening;
  _Side? _busy;
  String _partial = '';
  _Message? _last;
  bool _warnedOffline = false;

  Lang _langOf(_Side s) => s == _Side.me ? _myLang : _yourLang;

  @override
  void dispose() {
    _voice.stopListening();
    _voice.stopSpeaking();
    super.dispose();
  }

  Future<void> _tap(_Side side) async {
    if (_busy != null) return;
    if (_listening == side) {
      await _voice.stopListening();
      return;
    }
    if (_listening != null) await _voice.stopListening();

    final from = _langOf(side);
    final to = _langOf(side == _Side.me ? _Side.you : _Side.me);

    final missing = await _tr.missing({from, to});
    if (missing.isNotEmpty) {
      if (!mounted) return;
      final go = await _askDownload(missing);
      if (go == true && mounted) {
        await Navigator.push(context, MaterialPageRoute(builder: (_) => const LanguagesScreen()));
      }
      return;
    }

    setState(() {
      _listening = side;
      _partial = '';
    });
    final heard = await _voice.listen(
      from,
      onPartial: (p) => mounted ? setState(() => _partial = p) : null,
      onOfflineMissing: () {
        if (!_warnedOffline && mounted) {
          _warnedOffline = true;
          comicToast(context,
              'Voce offline per ${from.label} non installata sul telefono: uso il riconoscimento standard. '
              'Installala nelle impostazioni di sistema (Lingua › Riconoscimento vocale offline).');
        }
      },
    );
    if (!mounted) return;
    setState(() => _listening = null);

    final text = (heard ?? '').trim();
    if (heard == null) {
      comicToast(context, 'Microfono non disponibile: controlla i permessi.', color: MC.red);
      return;
    }
    if (text.isEmpty) {
      comicToast(context, 'Non ho sentito niente… riprova!');
      return;
    }

    setState(() => _busy = side);
    try {
      final out = await _tr.translate(text, from, to);
      if (!mounted) return;
      setState(() {
        _last = _Message(side, text, out);
        _busy = null;
      });
      await _voice.speak(out, to);
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = null);
      comicToast(context, 'Traduzione non riuscita: $e', color: MC.red);
    }
  }

  Future<bool?> _askDownload(List<Lang> missing) => showDialog<bool>(
        context: context,
        builder: (ctx) => Dialog(
          backgroundColor: Colors.transparent,
          child: ComicPanel(
            color: MC.paper,
            padding: const EdgeInsets.all(18),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const OutlinedTitle('OPS!', size: 40, fill: MC.red),
              const SizedBox(height: 8),
              Text(
                'Per tradurre offline scarica prima: ${missing.map((l) => '${l.flag} ${l.label}').join(', ')}.\n'
                'Serve internet solo questa volta.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                ComicButton(label: 'DOPO', color: MC.white, onTap: () => Navigator.pop(ctx, false)),
                ComicButton(label: 'SCARICA!', icon: Icons.download, onTap: () => Navigator.pop(ctx, true)),
              ]),
            ]),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Expanded(
        child: RotatedBox(
          quarterTurns: _faceToFace ? 2 : 0,
          child: _half(_Side.you),
        ),
      ),
      _middleBar(),
      Expanded(child: _half(_Side.me)),
    ]);
  }

  Widget _middleBar() => Container(
        height: 52,
        decoration: const BoxDecoration(
          color: MC.black,
          border: Border.symmetric(horizontal: BorderSide(color: MC.black, width: 2)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Row(children: [
          const OutlinedTitle('MANGA VOX', size: 26, stroke: 4),
          const Spacer(),
          _iconBtn(
            _faceToFace ? Icons.screen_rotation_alt : Icons.stay_current_portrait,
            _faceToFace ? 'Faccia a faccia' : 'Fianco a fianco',
            () {
              setState(() => _faceToFace = !_faceToFace);
              Prefs.setFlag('dlg_face', _faceToFace);
            },
          ),
          _iconBtn(Icons.swap_vert, 'Scambia lingue', () {
            setState(() {
              final t = _myLang;
              _myLang = _yourLang;
              _yourLang = t;
              _last = null;
            });
            Prefs.set('dlg_me', _myLang);
            Prefs.set('dlg_you', _yourLang);
          }),
          _iconBtn(Icons.download_for_offline, 'Lingue offline', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const LanguagesScreen()));
          }),
        ]),
      );

  Widget _iconBtn(IconData icon, String tip, VoidCallback onTap) => IconButton(
        tooltip: tip,
        onPressed: onTap,
        icon: Icon(icon, color: MC.yellow, size: 28),
      );

  Widget _half(_Side side) {
    final lang = _langOf(side);
    final listening = _listening == side;
    final busy = _busy == side;
    final isMe = side == _Side.me;

    // Cosa leggere in questa metà: la frase nella propria lingua.
    String? text;
    String? small;
    bool translatedForMe = false;
    if (listening) {
      text = _partial.isEmpty ? '…' : _partial;
    } else if (_last != null) {
      if (_last!.from == side) {
        text = _last!.original;
      } else {
        text = _last!.translated;
        small = _last!.original;
        translatedForMe = true;
      }
    }

    return HalftoneBackground(
      color: isMe ? MC.paper : const Color(0xFFE8F7FB),
      speedLines: listening,
      focus: const Alignment(0, 0.55),
      child: SafeArea(
        bottom: isMe,
        top: !isMe || !_faceToFace,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
          child: Column(children: [
            Row(children: [
              LangPicker(
                value: lang,
                color: isMe ? MC.yellow : MC.cyan,
                onChanged: (l) {
                  setState(() {
                    if (isMe) {
                      _myLang = l;
                    } else {
                      _yourLang = l;
                    }
                    _last = null;
                  });
                  Prefs.set(isMe ? 'dlg_me' : 'dlg_you', l);
                },
              ),
              const Spacer(),
              if (translatedForMe)
                IconButton(
                  tooltip: 'Ripeti',
                  onPressed: () => _voice.speak(text!, lang),
                  icon: const Icon(Icons.volume_up, size: 32, color: MC.black),
                ),
            ]),
            Expanded(
              child: Center(
                child: text == null
                    ? Text(
                        _hint(lang),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0x88111111)),
                      )
                    : SingleChildScrollView(
                        child: SpeechBubble(
                          color: translatedForMe ? MC.yellow : MC.white,
                          tailLeft: isMe,
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(text, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: MC.black)),
                            if (small != null) ...[
                              const SizedBox(height: 6),
                              Text(small,
                                  style: const TextStyle(
                                      fontSize: 14, fontStyle: FontStyle.italic, color: Color(0xAA111111))),
                            ],
                          ]),
                        ),
                      ),
              ),
            ),
            BurstButton(
              label: listening ? 'STOP' : 'PARLA!',
              icon: listening ? Icons.stop_rounded : Icons.mic,
              size: 128,
              color: isMe ? MC.yellow : MC.cyan,
              active: listening,
              busy: busy,
              onTap: () => _tap(side),
            ),
          ]),
        ),
      ),
    );
  }

  String _hint(Lang l) => switch (l) {
        Lang.it => 'Tocca e parla!',
        Lang.en => 'Tap and speak!',
        Lang.de => 'Tippen und sprechen!',
        Lang.fr => 'Touchez et parlez !',
        Lang.ru => 'Нажмите и говорите!',
        Lang.zh => '点击并说话！',
      };
}
