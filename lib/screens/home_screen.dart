import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../languages.dart';
import '../services/audio_route.dart';
import '../services/lang_detect.dart';
import '../services/langs.dart';
import '../services/live_speech.dart';
import '../services/ocr_service.dart';
import '../services/pitch.dart';
import '../services/prefs.dart';
import '../services/setup_service.dart';
import '../services/speech_service.dart';
import '../services/translator_service.dart';
import '../ui/manga.dart';
import '../ui/push_button.dart';
import 'audio_screen.dart';
import 'info_screen.dart';
import 'language_screen.dart';
import 'setup_screen.dart';
import 'world_screen.dart';

enum Mode { talk, scan }

/// Chi sta parlando: l'interlocutore (pulsante 1) o io (pulsante 2).
enum Side { them, me }

class _Msg {
  _Msg({
    required this.side,
    required this.from,
    required this.to,
    required this.original,
    required this.translated,
    this.gender,
  });
  final Side side;
  final Lang from, to;
  final String original, translated;

  /// Uomo/donna di chi ha parlato (dal tono), per leggere con una voce simile.
  final VoiceGender? gender;
}

/// Un blocco di testo inquadrato e la sua traduzione, con la posizione
/// nell'immagine (coordinate dell'immagine già raddrizzata).
class _LiveBlock {
  _LiveBlock(this.box, this.original, this.translated);
  final Rect box;
  final String original, translated;
}

/// Schermata principale.
/// VOCE, due pulsanti 3D da tenere premuti:
///  1. LUI/LEI (azzurro): la prima volta riconosce da solo la lingua
///     dell'interlocutore, poi resta su quella (si può cambiare o rimettere AUTO).
///  2. IO (giallo): parlo nella mia lingua, scelta al primo avvio.
///  Mentre si parla le parole e la traduzione compaiono in tempo reale;
///  al rilascio la traduzione definitiva viene letta ad alta voce.
/// SCANNER: inquadra e la traduzione nella mia lingua compare sopra il testo;
///  il pulsante scatta e traduce tutta la foto.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final _speech = SpeechService.instance;
  final _live = LiveSpeech.instance;
  final _tr = TranslatorService.instance;
  final _ocr = OcrService.instance;

  Lang _mine = Prefs.get('mine', Lang.deviceDefault());
  Lang? _partner = Prefs.maybe('partner2');

  Mode _mode = Mode.talk;
  bool _ready = true;
  final List<_Msg> _talk = [];

  // Voce: stato del pulsante attivo.
  Side? _active;
  PushState _state = PushState.idle;
  bool _ignoreRelease = false;
  String _liveTranslation = '';
  Timer? _partialTimer;
  int _partialSeq = 0;

  // Scanner
  CameraController? _cam;
  String? _camError;
  bool _frameBusy = false;
  bool _shooting = false;
  DateTime _lastFrame = DateTime.fromMillisecondsSinceEpoch(0);
  final Map<String, String> _memo = {};
  List<_LiveBlock> _liveBlocks = [];
  Size? _liveImage;
  String? _liveStatus;
  List<(String, String)>? _scanResult;
  Lang? _scanFrom;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _live.partial.addListener(_onPartial);
    WidgetsBinding.instance.addPostFrameCallback((_) => _firstRun());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _live.partial.removeListener(_onPartial);
    _partialTimer?.cancel();
    _disposeCamera();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      if (_active != null) {
        _live.cancel();
        setState(() {
          _active = null;
          _state = PushState.idle;
        });
      }
      if (_mode == Mode.scan) _disposeCamera();
    } else if (state == AppLifecycleState.resumed && _mode == Mode.scan) {
      _initCamera();
    }
  }

  // ───────────────────────── primo avvio ─────────────────────────

  Future<void> _firstRun() async {
    if (!Prefs.flag('mine_set')) {
      final l = await Navigator.push<Lang>(
        context,
        MaterialPageRoute(builder: (_) => LanguageScreen(initial: Lang.deviceDefault())),
      );
      if (l != null) _setMine(l);
      await Prefs.setFlag('mine_set', true);
    }
    await _checkSetup(openIfMissing: true);
    // Chiede subito i permessi del microfono, così il primo uso è immediato.
    try {
      final p = await _live.permissions();
      if (!p.ok && !p.denied) await _live.request();
    } catch (_) {}
  }

  Future<void> _checkSetup({bool openIfMissing = false}) async {
    final s = await SetupService.status();
    if (!mounted) return;
    setState(() => _ready = s.voiceReady);
    if (!openIfMissing) return;
    if (!s.complete) {
      await _openSetup();
    } else if (!s.appleComplete && !Prefs.flag('apple_offered')) {
      await Prefs.setFlag('apple_offered', true);
      await _openSetup();
    }
  }

  Future<void> _openSetup() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const SetupScreen()));
    _memo.clear();
    await _checkSetup();
  }

  Future<void> _openWorld() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const WorldScreen()));
    _memo.clear();
    if (mounted) setState(() {});
  }

  /// La lingua riconosciuta non è ancora scaricata: lo dico e propongo il download.
  void _notInstalled(Lang l) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 6),
          backgroundColor: MC.black,
          content: Text(
            'Ho riconosciuto ${l.flag} ${l.itName}, ma non è ancora scaricata.',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          action: SnackBarAction(label: '🌍 SCARICA', textColor: MC.yellow, onPressed: _openWorld),
        ),
      );
  }

  Future<void> _openAudio() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => AudioScreen(mine: _mine)));
  }

  void _setMine(Lang l) {
    setState(() {
      _mine = l;
      if (_partner == l) _partner = null;
      _memo.clear();
      _liveBlocks = [];
    });
    Prefs.set('mine', l);
    Prefs.setMaybe('partner2', _partner);
  }

  void _setPartner(Lang? l) {
    setState(() => _partner = l == _mine ? null : l);
    Prefs.setMaybe('partner2', _partner);
  }

  Future<void> _pickMine() async {
    if (_active != null) return;
    final l = await pickLanguage(context, _mine);
    if (l != null) _setMine(l);
  }

  Future<void> _pickPartner() async {
    if (_active != null) return;
    final l = await showModalBottomSheet<Object>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(12),
        child: ComicPanel(
          color: MC.paper,
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const OutlinedTitle('LINGUA DELL\'ALTRO', size: 26),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx, 'auto'),
                  child: ComicPanel(
                    color: _partner == null ? MC.cyan : MC.white,
                    shadow: 3,
                    child: const Row(
                      children: [
                        Icon(Icons.auto_awesome, size: 26),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'AUTOMATICA: la riconosco io',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final l in Langs.installed.where((l) => l != _mine))
                      GestureDetector(
                        onTap: () => Navigator.pop(ctx, l),
                        child: ComicPanel(
                          color: l == _partner ? MC.cyan : MC.white,
                          shadow: 3,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          child: Text(
                            '${l.flag} ${l.label}',
                            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx, 'world'),
                  child: const ComicPanel(
                    color: MC.yellow,
                    shadow: 3,
                    child: Row(
                      children: [
                        Text('🌍', style: TextStyle(fontSize: 24)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'ALTRE LINGUE DEL MONDO: tocca il paese e la scarico',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (l == 'world') {
      await _openWorld();
      return;
    }
    if (l == 'auto') _setPartner(null);
    if (l is Lang) _setPartner(l);
  }

  void _missing(MissingLanguage e) =>
      _toast('Manca il pacchetto ${e.lang.flag} ${e.lang.label}: tocca ⬇ in alto per scaricarlo.', error: true);

  void _toast(String msg, {bool error = false}) => comicToast(context, msg, color: error ? MC.red : MC.yellow);

  // ───────────────────────── voce ─────────────────────────

  Future<void> _press(Side side) async {
    _ignoreRelease = false;
    if (_active != null || _state != PushState.idle) {
      _ignoreRelease = true;
      return;
    }
    if (!_ready) {
      _ignoreRelease = true;
      _openSetup();
      return;
    }
    if (side == Side.me && _partner == null) {
      _ignoreRelease = true;
      _toast(
        'Prima fai parlare l\'altra persona col pulsante azzurro (riconosco la sua lingua), oppure sceglila qui sotto.',
      );
      return;
    }
    _speech.stopSpeaking();
    setState(() {
      _active = side;
      _state = PushState.recording;
      _liveTranslation = '';
    });
    final lang = side == Side.me ? _mine : _partner; // null = da riconoscere
    bool ok;
    try {
      // IO: microfono delle cuffie (se collegate); LUI/LEI: microfono del telefono.
      ok = await _live.start(lang, headsetMic: side == Side.me && AudioRoute.enabled);
    } catch (e) {
      ok = false;
    }
    if (!ok && mounted) {
      setState(() {
        _active = null;
        _state = PushState.idle;
      });
      _ignoreRelease = true;
      _toast('Il microfono non è attivo: lo attiviamo dal pannello AUDIO.', error: true);
      _openAudio();
    }
  }

  /// Traduzione in tempo reale delle parole parziali (mentre si parla).
  void _onPartial() {
    if (_active == null || _state != PushState.recording) return;
    setState(() {});
    final from = _active == Side.me ? _mine : _partner;
    final to = _active == Side.me ? _partner : _mine;
    final text = _live.partial.value.trim();
    if (from == null || to == null || text.isEmpty) return;
    _partialTimer?.cancel();
    _partialTimer = Timer(const Duration(milliseconds: 350), () async {
      final seq = ++_partialSeq;
      try {
        final out = await _tr.translate(text, from, to);
        if (mounted && seq == _partialSeq && _state == PushState.recording) {
          setState(() => _liveTranslation = out);
        }
      } catch (_) {}
    });
  }

  Future<void> _release(Side side) async {
    if (_ignoreRelease || _active != side || _state != PushState.recording) return;
    _partialTimer?.cancel();
    _partialSeq++;
    setState(() => _state = PushState.busy);
    LiveResult? r;
    try {
      r = await _live.stop();
      if (!mounted) return;
      if (r.error != null) {
        _toast('Errore del microfono: ${r.error}', error: true);
        return;
      }
      if (r.tooShort) {
        _toast('Tieni premuto il pulsante MENTRE parli, poi lascialo.');
        return;
      }
      if (r.silent && r.text.isEmpty) {
        _toast('Non sento la voce: prova il microfono nel pannello AUDIO 🔊.', error: true);
        return;
      }

      // Uomo o donna? Lo stima il tono della voce, in parallelo alla traduzione.
      final genderFuture = r.audioPath == null ? Future<VoiceGender?>.value() : genderFromWav(r.audioPath!);
      var from = side == Side.me ? _mine : _partner;
      var text = r.text;

      if (side == Side.them && (from == null || text.isEmpty) && r.audioPath != null) {
        // Lingua dell'interlocutore ancora sconosciuta (o non capita):
        // la riconosce Whisper, poi la frase viene trascritta bene in quella lingua.
        final d = await _speech.detect(r.audioPath!);
        if (!mounted) return;
        final lang = d.lang;
        if (lang == null) {
          _toast('Non ho riconosciuto la lingua: parla un po\' più a lungo e più vicino.');
          return;
        }
        if (!Langs.isInstalled(lang)) {
          _notInstalled(lang);
          return;
        }
        if (lang == _mine) {
          _toast('Questa era ${_mine.label}: per la tua lingua usa il pulsante giallo IO.');
          return;
        }
        if (lang != _partner) _setPartner(lang);
        from = lang;
        text = (await _live.recognizeFile(r.audioPath!, lang))?.trim() ?? '';
        if (text.isEmpty) text = d.text;
      }

      if (from == null || text.isEmpty) {
        _toast('Non ho capito le parole: parla un po\' più vicino e più a lungo.');
        return;
      }
      final to = side == Side.me ? _partner! : _mine;
      final out = await _tr.translate(text, from, to);
      final gender = await genderFuture;
      if (!mounted) return;
      setState(() {
        _talk.add(_Msg(side: side, from: from!, to: to, original: text, translated: out, gender: gender));
        _active = null;
        _state = PushState.idle;
        _liveTranslation = '';
      });
      // La mia frase tradotta la sente l'altro (altoparlante); la sua la sento io (cuffie).
      await _speech.speak(out, to, gender: gender, hearer: side == Side.me ? Hearer.partner : Hearer.me);
    } on MissingLanguage catch (e) {
      if (mounted) _missing(e);
    } catch (e) {
      if (mounted) _toast('Qualcosa è andato storto: $e', error: true);
    } finally {
      LiveSpeech.deleteAudio(r?.audioPath);
      if (mounted && (_active != null || _state != PushState.idle)) {
        setState(() {
          _active = null;
          _state = PushState.idle;
          _liveTranslation = '';
        });
      }
    }
  }

  // ───────────────────────── scanner ─────────────────────────

  Future<void> _setMode(Mode m) async {
    if (m == _mode || _active != null || _shooting) return;
    setState(() {
      _mode = m;
      _scanResult = null;
      _liveBlocks = [];
      _liveStatus = null;
    });
    if (m == Mode.scan) {
      await _initCamera();
    } else {
      await _disposeCamera();
      _speech.stopSpeaking();
    }
  }

  Future<void> _initCamera() async {
    if (_cam != null) return;
    try {
      final cams = await availableCameras();
      if (cams.isEmpty) {
        setState(() => _camError = 'Nessuna fotocamera trovata.');
        return;
      }
      final back = cams.firstWhere((c) => c.lensDirection == CameraLensDirection.back, orElse: () => cams.first);
      final c = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
      );
      await c.initialize();
      if (!mounted || _mode != Mode.scan) {
        await c.dispose();
        return;
      }
      setState(() {
        _cam = c;
        _camError = null;
      });
      await _startLiveScan();
    } on CameraException catch (e) {
      if (mounted) {
        setState(
          () => _camError = e.code.contains('Access')
              ? 'Serve il permesso della fotocamera: Impostazioni › Manga Vox › Fotocamera.'
              : 'Fotocamera non disponibile (${e.code}).',
        );
      }
    }
  }

  Future<void> _disposeCamera() async {
    final c = _cam;
    _cam = null;
    if (c == null) return;
    if (c.value.isStreamingImages) {
      try {
        await c.stopImageStream();
      } catch (_) {}
    }
    await c.dispose();
  }

  Future<void> _startLiveScan() async {
    final c = _cam;
    if (c == null || !c.value.isInitialized || c.value.isStreamingImages) return;
    try {
      await c.startImageStream(_onFrame);
    } catch (_) {}
  }

  Future<void> _stopLiveScan() async {
    final c = _cam;
    if (c != null && c.value.isStreamingImages) {
      try {
        await c.stopImageStream();
      } catch (_) {}
    }
  }

  Future<void> _onFrame(CameraImage image) async {
    final now = DateTime.now();
    if (_frameBusy || _shooting || _scanResult != null) return;
    if (now.difference(_lastFrame) < const Duration(milliseconds: 650)) return;
    _frameBusy = true;
    _lastFrame = now;
    try {
      final input = _toInputImage(image);
      if (input == null) return;
      final rotated =
          input.metadata!.rotation == InputImageRotation.rotation90deg ||
          input.metadata!.rotation == InputImageRotation.rotation270deg;
      final upright = rotated
          ? Size(image.height.toDouble(), image.width.toDouble())
          : Size(image.width.toDouble(), image.height.toDouble());

      final recognized = await _ocr.recognizer.processImage(input);
      final blocks = recognized.blocks
          .map((b) => (b.boundingBox, b.lines.map((l) => l.text).join(' ').trim()))
          .where((b) => b.$2.length >= 2)
          .take(12)
          .toList();
      if (!mounted) return;
      if (blocks.isEmpty) {
        setState(() {
          _liveBlocks = [];
          _liveStatus = null;
        });
        return;
      }
      final lang = await LangDetect.instance.detect(blocks.map((b) => b.$2).join(' '));
      final mine = _mine;
      if (lang == null) {
        setState(() {
          _liveBlocks = [];
          _liveStatus = 'Lingua non riconosciuta (per il russo premi SCATTA)';
        });
        return;
      }
      if (!Langs.isInstalled(lang)) {
        setState(() {
          _liveBlocks = [];
          _liveStatus = 'È ${lang.flag} ${lang.itName}: scaricala da 🌍 (pulsante ⬇ in alto)';
        });
        return;
      }
      if (lang == mine) {
        setState(() {
          _liveBlocks = [];
          _liveStatus = 'Testo già in ${mine.flag} ${mine.label}';
        });
        return;
      }
      final out = <_LiveBlock>[];
      for (final (box, text) in blocks) {
        final key = '${lang.name}>${mine.name}:$text';
        out.add(_LiveBlock(box, text, _memo[key] ??= await _tr.translate(text, lang, mine)));
      }
      if (_memo.length > 400) _memo.clear();
      if (mounted && !_shooting && _scanResult == null && mine == _mine) {
        setState(() {
          _liveBlocks = out;
          _liveImage = upright;
          _liveStatus = '${lang.flag} ➜ ${mine.flag}';
        });
      }
    } on MissingLanguage catch (e) {
      if (mounted) {
        setState(() {
          _liveBlocks = [];
          _liveStatus = 'Manca il pacchetto ${e.lang.flag} ${e.lang.label}: tocca ⬇ in alto';
        });
      }
    } catch (_) {
      // Un fotogramma andato male non ferma lo scanner.
    } finally {
      _frameBusy = false;
    }
  }

  InputImage? _toInputImage(CameraImage image) {
    final c = _cam;
    if (c == null) return null;
    // App bloccata in verticale: la rotazione è quella del sensore.
    final rotation = InputImageRotationValue.fromRawValue(c.description.sensorOrientation);
    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (rotation == null || format == null || image.planes.length != 1) return null;
    if (Platform.isAndroid && format != InputImageFormat.nv21) return null;
    if (Platform.isIOS && format != InputImageFormat.bgra8888) return null;
    final plane = image.planes.first;
    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  /// Scatta e traduce tutto il testo nella MIA lingua.
  Future<void> _shoot() async {
    final c = _cam;
    if (!_ready) {
      _openSetup();
      return;
    }
    if (c == null || !c.value.isInitialized || _shooting) return;
    setState(() {
      _shooting = true;
      _liveBlocks = [];
    });
    try {
      await _stopLiveScan();
      final shot = await c.takePicture();
      final r = await _ocr.readFile(shot.path);
      unawaited(File(shot.path).delete().catchError((_) => File(shot.path)));
      if (!mounted) return;
      if (r.blocks.isEmpty) {
        _toast('Nessun testo trovato. Avvicinati e tieni fermo il telefono!');
        return;
      }
      final from = r.lang;
      if (from == null) {
        _toast('Lingua del testo non riconosciuta.');
        return;
      }
      if (!Langs.isInstalled(from)) {
        _notInstalled(from);
        return;
      }
      final out = <(String, String)>[];
      for (final b in r.blocks) {
        out.add((b, await _tr.translate(b, from, _mine)));
      }
      if (mounted) {
        setState(() {
          _scanResult = out;
          _scanFrom = from;
        });
      }
    } on MissingLanguage catch (e) {
      if (mounted) _missing(e);
    } catch (e) {
      if (mounted) _toast('Scansione non riuscita: $e', error: true);
    } finally {
      if (mounted) setState(() => _shooting = false);
      if (_scanResult == null) await _startLiveScan();
    }
  }

  Future<void> _closeResult() async {
    setState(() => _scanResult = null);
    _speech.stopSpeaking();
    await _startLiveScan();
  }

  // ───────────────────────── UI ─────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MC.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_mode == Mode.talk)
            HalftoneBackground(
              speedLines: _state == PushState.recording,
              focus: Alignment(_active == Side.me ? 0.5 : -0.5, 0.7),
              child: const SizedBox.expand(),
            )
          else ...[
            _cameraLayer(),
            if (_scanResult == null) _liveOverlay(),
          ],
          SafeArea(
            child: Column(
              children: [
                _topBar(),
                Expanded(child: _mode == Mode.talk ? _talkContent() : _scanContent()),
                if (_mode == Mode.talk) _talkButtons() else _scanButton(),
                const SizedBox(height: 6),
              ],
            ),
          ),
          // Logo FPM, piccolo e discreto: in basso al centro tra le lingue
          // (pagina Voce) o in basso a destra (pagina Scanner).
          Positioned(
            left: _mode == Mode.talk ? 0 : null,
            right: _mode == Mode.talk ? 0 : 14,
            bottom: MediaQuery.paddingOf(context).bottom + (_mode == Mode.talk ? 4 : 12),
            child: Center(
              child: Opacity(opacity: 0.92, child: FpmBadge(size: _mode == Mode.talk ? 34 : 38)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _topBar() {
    final onCam = _mode == Mode.scan;
    final iconColor = onCam ? MC.yellow : MC.black;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 0, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InfoScreen())),
            child: const OutlinedTitle('MANGA VOX', size: 26, stroke: 5),
          ),
          const Spacer(),
          _modeSwitch(),
          IconButton(
            tooltip: 'Audio e microfono',
            onPressed: _active == null ? _openAudio : null,
            icon: Icon(Icons.tune, size: 28, color: iconColor),
          ),
          IconButton(
            tooltip: 'Lingue offline',
            onPressed: _active == null ? _openSetup : null,
            icon: Icon(Icons.download_for_offline, size: 28, color: iconColor),
          ),
        ],
      ),
    );
  }

  Widget _modeSwitch() => ComicPanel(
    padding: const EdgeInsets.all(2),
    shadow: 3,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final (m, icon, tip) in [(Mode.talk, Icons.mic, 'Voce'), (Mode.scan, Icons.photo_camera, 'Scanner')])
          Tooltip(
            message: tip,
            child: GestureDetector(
              onTap: () => _setMode(m),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _mode == m ? MC.black : MC.white,
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Icon(icon, size: 22, color: _mode == m ? MC.yellow : MC.black),
              ),
            ),
          ),
      ],
    ),
  );

  /// I due pulsanti: 1 = l'altra persona (lingua automatica), 2 = io.
  Widget _talkButtons() {
    final width = MediaQuery.sizeOf(context).width;
    final size = (width * 0.36).clamp(110.0, 175.0);
    Widget column(Side side) {
      final isMe = side == Side.me;
      final active = _active == side;
      final otherBusy = _active != null && !active;
      final lang = isMe ? _mine : _partner;
      final state = !_ready
          ? PushState.disabled
          : otherBusy
          ? PushState.disabled
          : (active ? _state : PushState.idle);
      return Expanded(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ValueListenableBuilder<double>(
              valueListenable: _live.level,
              builder: (_, lvl, _) => PushButton3D(
                state: state,
                level: active ? lvl : 0,
                size: size,
                icon: isMe ? Icons.person : Icons.record_voice_over,
                idleFace: isMe ? MC.yellow : MC.cyan,
                idleSide: isMe ? const Color(0xFFC79A00) : const Color(0xFF00708A),
                label: isMe ? 'IO\n${_mine.flag}' : (lang == null ? 'LUI/LEI\nAUTO' : 'LUI/LEI\n${lang.flag}'),
                onPress: () => _press(side),
                onRelease: () => _release(side),
              ),
            ),
            GestureDetector(
              onTap: isMe ? _pickMine : _pickPartner,
              child: ComicPanel(
                color: isMe ? MC.yellow : MC.cyan,
                shadow: 3,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      lang == null ? '✨ AUTO' : '${lang.flag} ${lang.label}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                    ),
                    const Icon(Icons.arrow_drop_down, color: MC.black, size: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [column(Side.them), column(Side.me)]),
    );
  }

  Widget _scanButton() {
    final width = MediaQuery.sizeOf(context).width;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        PushButton3D(
          state: !_ready ? PushState.disabled : (_shooting ? PushState.busy : PushState.idle),
          size: (width * 0.34).clamp(110.0, 170.0),
          icon: Icons.photo_camera,
          label: 'SCATTA!',
          onPress: () {},
          onRelease: _shoot,
        ),
        GestureDetector(
          onTap: _pickMine,
          child: ComicPanel(
            color: MC.yellow,
            shadow: 3,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Text(
              'TRADUCO IN ${_mine.flag} ${_mine.label.toUpperCase()} ▾',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
            ),
          ),
        ),
      ],
    );
  }

  Widget _talkContent() {
    final speaking = _active != null && _state == PushState.recording;
    final children = <Widget>[];
    if (_talk.isEmpty && !speaking) {
      children.add(
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
          child: SpeechBubble(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('DUE PULSANTI, TIENI PREMUTO E PARLA!', textAlign: TextAlign.center, style: comic(22)),
                const SizedBox(height: 6),
                Text(
                  '🔵 LUI/LEI: l\'altra persona parla nella sua lingua, la riconosco da sola.\n'
                  '🟡 IO: parli tu in ${_mine.label}.\n'
                  'Lascia il pulsante e leggo la traduzione ad alta voce.',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, height: 1.35),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final width = MediaQuery.sizeOf(context).width;
    // Ordine di chat: la più vecchia in alto, la nuova sotto. La lista è
    // "rovesciata" (ancorata in basso), quindi l'ultima resta sempre visibile.
    for (final m in _talk) {
      final fromMe = m.side == Side.me;
      children.add(
        Align(
          alignment: fromMe ? Alignment.centerRight : Alignment.centerLeft,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: width * 0.86),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 6),
              child: GestureDetector(
                onTap: () => _speech.speak(
                  m.translated,
                  m.to,
                  gender: m.gender,
                  force: true,
                  hearer: m.side == Side.me ? Hearer.partner : Hearer.me,
                ),
                child: SpeechBubble(
                  color: fromMe ? MC.yellow : MC.cyan,
                  tailLeft: !fromMe,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${m.from.flag} ➜ ${m.to.flag}  🔊${m.gender == VoiceGender.male ? '  ♂' : (m.gender == VoiceGender.female ? '  ♀' : '')}',
                        style: const TextStyle(fontSize: 14),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        m.translated,
                        style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900, color: MC.black, height: 1.2),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        m.original,
                        style: const TextStyle(fontSize: 13.5, fontStyle: FontStyle.italic, color: Color(0xAA111111)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    return Column(
      children: [
        Expanded(
          child: ListView(
            reverse: true,
            padding: const EdgeInsets.only(top: 8, bottom: 8),
            children: children.reversed.toList(),
          ),
        ),
        if (_active != null) _livePanel(),
      ],
    );
  }

  /// Riquadro "in diretta": parole riconosciute e traduzione mentre si parla.
  Widget _livePanel() {
    final isMe = _active == Side.me;
    final from = isMe ? _mine : _partner;
    final to = isMe ? _partner : _mine;
    final heard = _live.partial.value;
    final busy = _state == PushState.busy;
    final placeholder = busy
        ? (from == null ? 'Riconosco la lingua…' : 'Traduco…')
        : (from == null ? 'Parla pure: riconosco la lingua quando lasci il pulsante' : 'Ti ascolto…');
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: ComicPanel(
        color: MC.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('${from?.flag ?? '✨'} ➜ ${to?.flag ?? '?'}  IN DIRETTA', style: comic(16, color: MC.red)),
            const SizedBox(height: 4),
            Text(
              _liveTranslation.isNotEmpty ? _liveTranslation : (heard.isEmpty ? placeholder : '…'),
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900, height: 1.2),
            ),
            if (heard.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                  heard,
                  style: const TextStyle(fontSize: 13.5, fontStyle: FontStyle.italic, color: Color(0xAA111111)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _cameraLayer() {
    final c = _cam;
    if (c != null && c.value.isInitialized) {
      return ClipRect(
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: c.value.previewSize?.height ?? 1,
            height: c.value.previewSize?.width ?? 1,
            child: CameraPreview(c),
          ),
        ),
      );
    }
    return HalftoneBackground(
      color: const Color(0xFF222222),
      dotColor: const Color(0x33FFFFFF),
      speedLines: true,
      child: Center(
        child: _camError == null
            ? const CircularProgressIndicator(color: MC.yellow)
            : Padding(
                padding: const EdgeInsets.all(24),
                child: ComicPanel(
                  color: MC.red,
                  child: Text(_camError!, style: comic(22, color: MC.white)),
                ),
              ),
      ),
    );
  }

  /// Traduzioni scritte sopra il testo inquadrato, come etichette fumetto.
  /// L'anteprima riempie lo schermo (BoxFit.cover): stessa trasformazione.
  Widget _liveOverlay() {
    final img = _liveImage;
    if (img == null || _liveBlocks.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, cons) {
        final scale = [cons.maxWidth / img.width, cons.maxHeight / img.height].reduce((a, b) => a > b ? a : b);
        final dx = (cons.maxWidth - img.width * scale) / 2;
        final dy = (cons.maxHeight - img.height * scale) / 2;
        return Stack(
          children: [
            for (final b in _liveBlocks)
              Positioned(
                left: (dx + b.box.left * scale).clamp(0.0, cons.maxWidth - 40),
                top: (dy + b.box.top * scale).clamp(0.0, cons.maxHeight - 24),
                width: (b.box.width * scale).clamp(60.0, cons.maxWidth),
                child: IgnorePointer(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: MC.yellow.withValues(alpha: 0.93),
                      border: Border.all(color: MC.black, width: 2),
                      borderRadius: BorderRadius.circular(4),
                      boxShadow: const [BoxShadow(color: MC.black, offset: Offset(2, 2))],
                    ),
                    child: Text(
                      b.translated,
                      style: TextStyle(
                        fontSize: (b.box.height * scale / (b.original.length > 40 ? 3.2 : 1.8)).clamp(11.0, 24.0),
                        fontWeight: FontWeight.w900,
                        color: MC.black,
                        height: 1.1,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _scanContent() {
    final maxH = MediaQuery.sizeOf(context).height * 0.5;
    if (_scanResult != null) {
      return Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxH),
            child: ComicPanel(
              color: MC.paper,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text('${_scanFrom?.flag ?? ''} ➜ ${_mine.flag}', style: const TextStyle(fontSize: 18)),
                      const Spacer(),
                      GestureDetector(
                        onTap: _closeResult,
                        child: const Icon(Icons.close, size: 28, color: MC.black),
                      ),
                    ],
                  ),
                  const Divider(color: MC.black, thickness: 2),
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      children: [
                        for (final (orig, tr) in _scanResult!)
                          InkWell(
                            onTap: () => _speech.speak(tr, _mine, force: true),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 5),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tr,
                                    style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: MC.black),
                                  ),
                                  Text(
                                    orig,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontStyle: FontStyle.italic,
                                      color: Color(0x99111111),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    final status = _liveStatus ?? 'Inquadra un testo: lo traduco in ${_mine.flag} ${_mine.label}';
    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: ComicPanel(
          color: MC.paper,
          shadow: 3,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Text(
            status,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
          ),
        ),
      ),
    );
  }
}
