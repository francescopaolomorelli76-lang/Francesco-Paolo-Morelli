import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../languages.dart';
import '../services/direction.dart';
import '../services/lang_detect.dart';
import '../services/ocr_service.dart';
import '../services/prefs.dart';
import '../services/setup_service.dart';
import '../services/speech_service.dart';
import '../services/translator_service.dart';
import '../ui/manga.dart';
import '../ui/push_button.dart';
import 'language_screen.dart';
import 'setup_screen.dart';

enum Mode { talk, scan }

class _Msg {
  _Msg({required this.from, required this.to, required this.original, required this.translated});
  final Lang from, to;
  final String original, translated;
}

/// Un blocco di testo inquadrato e la sua traduzione, con la posizione
/// nell'immagine (coordinate dell'immagine già raddrizzata).
class _LiveBlock {
  _LiveBlock(this.box, this.original, this.translated);
  final Rect box;
  final String original, translated;
}

/// Un'unica schermata, un unico grande pulsante 3D.
/// - VOCE: tieni premuto e parla in qualsiasi lingua, lascia → traduce e legge.
///   Se parli nella TUA lingua traduce per l'interlocutore, altrimenti per te.
/// - SCANNER: inquadra e basta. La lingua del testo è riconosciuta e la
///   traduzione nella TUA lingua compare sopra il testo, in tempo reale.
///   Il pulsante scatta una foto e traduce tutto il testo.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final _speech = SpeechService.instance;
  final _tr = TranslatorService.instance;
  final _ocr = OcrService.instance;

  late final Direction _dir = Direction(
    mine: Prefs.get('mine', Lang.deviceDefault()),
    partner: Prefs.get('partner', Lang.deviceDefault() == Lang.en ? Lang.it : Lang.en),
  );

  Mode _mode = Mode.talk;
  PushState _btn = PushState.idle;
  bool _ready = true;
  bool _ignoreRelease = false;
  final List<_Msg> _talk = [];

  // Scanner
  CameraController? _cam;
  String? _camError;
  bool _frameBusy = false;
  DateTime _lastFrame = DateTime.fromMillisecondsSinceEpoch(0);
  final Map<String, String> _memo = {};
  List<_LiveBlock> _live = [];
  Size? _liveImage;
  String? _liveStatus;
  List<(String, String)>? _scanResult;
  Lang? _scanFrom;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _firstRun());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeCamera();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_mode != Mode.scan) return;
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _disposeCamera();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  // ───────────────────────── primo avvio e preparazione ─────────────────────────

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
  }

  Future<void> _checkSetup({bool openIfMissing = false}) async {
    final s = await SetupService.status();
    if (!mounted) return;
    setState(() => _ready = s.voiceReady);
    if (!s.complete && openIfMissing) await _openSetup();
  }

  Future<void> _openSetup() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const SetupScreen()));
    _memo.clear();
    await _checkSetup();
  }

  void _setMine(Lang l) {
    setState(() {
      _dir.mine = l;
      if (_dir.partner == l) _dir.partner = l == Lang.en ? Lang.it : Lang.en;
      _memo.clear();
      _live = [];
    });
    Prefs.set('mine', _dir.mine);
    Prefs.set('partner', _dir.partner);
  }

  Future<void> _pickMine() async {
    if (_btn != PushState.idle) return;
    final l = await pickLanguage(context, _dir.mine);
    if (l != null) _setMine(l);
  }

  void _missing(MissingLanguage e) {
    comicToast(
      context,
      'Manca il pacchetto ${e.lang.flag} ${e.lang.label}: tocca ⬇ in alto per scaricarlo.',
      color: MC.red,
    );
  }

  // ───────────────────────── pulsante ─────────────────────────

  void _onPress() {
    if (!_ready) {
      _ignoreRelease = true;
      _openSetup();
      return;
    }
    _ignoreRelease = false;
    if (_mode == Mode.talk) _startTalk();
  }

  void _onRelease() {
    if (_ignoreRelease) return;
    _mode == Mode.talk ? _finishTalk() : _shoot();
  }

  // ───────────────────────── voce ─────────────────────────

  Future<void> _startTalk() async {
    setState(() => _btn = PushState.recording);
    final ok = await _speech.startRecording();
    if (!ok && mounted) {
      setState(() => _btn = PushState.idle);
      _ignoreRelease = true;
      comicToast(context, 'Serve il permesso del microfono: Impostazioni › Manga Vox › Microfono.', color: MC.red);
    }
  }

  Future<void> _finishTalk() async {
    if (_btn != PushState.recording) return;
    setState(() => _btn = PushState.busy);
    try {
      final heard = await _speech.stopAndTranscribe();
      if (!mounted) return;
      if (heard.tooShort) {
        comicToast(context, 'Tieni premuto il pulsante MENTRE parli, poi lascialo.');
        return;
      }
      if (heard.error != null) {
        comicToast(context, 'Errore del riconoscimento vocale: ${heard.error}', color: MC.red);
        return;
      }
      if (heard.silent) {
        comicToast(
          context,
          'Il microfono non riceve audio (${heard.debug}). Controlla Impostazioni › Manga Vox › Microfono '
          'e che nessun\'altra app lo stia usando.',
          color: MC.red,
        );
        return;
      }
      final text = heard.text;
      if (text.isEmpty) {
        comicToast(
          context,
          'Ho sentito la voce ma non ho capito le parole: parla più vicino e un po\' più a lungo. (${heard.debug})',
        );
        return;
      }
      final lang = await LangDetect.instance.detect(text);
      if (!mounted) return;
      if (lang == null) {
        comicToast(context, 'Lingua non riconosciuta. Parlo: italiano, inglese, tedesco, francese, russo e cinese.');
        return;
      }
      final (from, to) = _dir.route(lang);
      Prefs.set('partner', _dir.partner);
      final out = await _tr.translate(text, from, to);
      if (!mounted) return;
      setState(() {
        _talk.add(_Msg(from: from, to: to, original: text, translated: out));
        _btn = PushState.idle;
      });
      await _speech.speak(out, to);
    } on MissingLanguage catch (e) {
      if (mounted) _missing(e);
    } catch (e) {
      if (mounted) comicToast(context, 'Qualcosa è andato storto: $e', color: MC.red);
    } finally {
      if (mounted && _btn != PushState.idle) setState(() => _btn = PushState.idle);
    }
  }

  // ───────────────────────── scanner ─────────────────────────

  Future<void> _setMode(Mode m) async {
    if (m == _mode || _btn != PushState.idle) return;
    setState(() {
      _mode = m;
      _scanResult = null;
      _live = [];
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
      await _startLive();
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

  /// Traduzione dal vivo: parte da sola appena la fotocamera è pronta.
  Future<void> _startLive() async {
    final c = _cam;
    if (c == null || !c.value.isInitialized || c.value.isStreamingImages) return;
    try {
      await c.startImageStream(_onFrame);
    } catch (_) {}
  }

  Future<void> _stopLive() async {
    final c = _cam;
    if (c != null && c.value.isStreamingImages) {
      try {
        await c.stopImageStream();
      } catch (_) {}
    }
  }

  Future<void> _onFrame(CameraImage image) async {
    final now = DateTime.now();
    if (_frameBusy || _btn != PushState.idle || _scanResult != null) return;
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
          _live = [];
          _liveStatus = null;
        });
        return;
      }
      final lang = await LangDetect.instance.detect(blocks.map((b) => b.$2).join(' '));
      final mine = _dir.mine;
      if (lang == null) {
        setState(() {
          _live = [];
          _liveStatus = 'Lingua non riconosciuta (per il russo premi SCATTA)';
        });
        return;
      }
      if (lang == mine) {
        setState(() {
          _live = [];
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
      if (mounted && _btn == PushState.idle && _scanResult == null && mine == _dir.mine) {
        setState(() {
          _live = out;
          _liveImage = upright;
          _liveStatus = '${lang.flag} ➜ ${mine.flag}';
        });
      }
    } on MissingLanguage catch (e) {
      if (mounted) {
        setState(() {
          _live = [];
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

  /// Pulsante in modalità scanner: scatta e traduce tutto nella MIA lingua.
  Future<void> _shoot() async {
    final c = _cam;
    if (c == null || !c.value.isInitialized || _btn != PushState.idle) return;
    setState(() {
      _btn = PushState.busy;
      _live = [];
    });
    try {
      await _stopLive();
      final shot = await c.takePicture();
      final r = await _ocr.readFile(shot.path);
      unawaited(File(shot.path).delete().catchError((_) => File(shot.path)));
      if (!mounted) return;
      if (r.blocks.isEmpty) {
        comicToast(context, 'Nessun testo trovato. Avvicinati e tieni fermo il telefono!');
        return;
      }
      final from = r.lang;
      if (from == null) {
        comicToast(context, 'Lingua del testo non riconosciuta.');
        return;
      }
      final to = _dir.mine;
      final out = <(String, String)>[];
      for (final b in r.blocks) {
        out.add((b, await _tr.translate(b, from, to)));
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
      if (mounted) comicToast(context, 'Scansione non riuscita: $e', color: MC.red);
    } finally {
      if (mounted) setState(() => _btn = PushState.idle);
      if (_scanResult == null) await _startLive();
    }
  }

  Future<void> _closeResult() async {
    setState(() => _scanResult = null);
    _speech.stopSpeaking();
    await _startLive();
  }

  // ───────────────────────── UI ─────────────────────────

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final btnSize = (width * (_mode == Mode.scan ? 0.38 : 0.5)).clamp(130.0, 220.0);
    return Scaffold(
      backgroundColor: MC.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_mode == Mode.talk)
            HalftoneBackground(
              speedLines: _btn == PushState.recording,
              focus: const Alignment(0, 0.62),
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
                ValueListenableBuilder<double>(
                  valueListenable: _speech.level,
                  builder: (_, lvl, _) => PushButton3D(
                    level: lvl,
                    state: _ready ? _btn : PushState.disabled,
                    size: btnSize,
                    icon: _mode == Mode.talk ? Icons.mic : Icons.photo_camera,
                    label: !_ready
                        ? 'PREPARA\nOFFLINE'
                        : _mode == Mode.talk
                        ? 'TIENI\nPREMUTO'
                        : 'SCATTA!',
                    onPress: _onPress,
                    onRelease: _onRelease,
                  ),
                ),
                _myLanguage(),
                const SizedBox(height: 6),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _topBar() => Padding(
    padding: const EdgeInsets.fromLTRB(12, 6, 6, 0),
    child: Row(
      children: [
        const OutlinedTitle('MANGA VOX', size: 28, stroke: 5),
        const Spacer(),
        _modeSwitch(),
        IconButton(
          tooltip: 'Lingue offline',
          onPressed: _btn == PushState.idle ? _openSetup : null,
          icon: Icon(Icons.download_for_offline, size: 30, color: _mode == Mode.scan ? MC.yellow : MC.black),
        ),
      ],
    ),
  );

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
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _mode == m ? MC.black : MC.white,
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Icon(icon, size: 24, color: _mode == m ? MC.yellow : MC.black),
              ),
            ),
          ),
      ],
    ),
  );

  /// In basso: la MIA lingua, l'unica da scegliere. Tutto viene tradotto qui.
  Widget _myLanguage() => Padding(
    padding: const EdgeInsets.only(top: 2),
    child: GestureDetector(
      onTap: _pickMine,
      child: ComicPanel(
        color: MC.yellow,
        shadow: 3,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('LA MIA LINGUA  ', style: comic(17)),
            Text(_dir.mine.flag, style: const TextStyle(fontSize: 20)),
            Text(
              ' ${_dir.mine.label.toUpperCase()}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const Icon(Icons.arrow_drop_down, color: MC.black),
          ],
        ),
      ),
    ),
  );

  Widget _talkContent() {
    if (_talk.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: SpeechBubble(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('TIENI PREMUTO E PARLA!', textAlign: TextAlign.center, style: comic(26)),
                const SizedBox(height: 6),
                Text(
                  'Riconosco da sola la lingua di chi parla. Se parli ${_dir.mine.label} traduco per l\'altro, '
                  'se l\'altro risponde traduco in ${_dir.mine.label} per te.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(Lang.values.map((l) => l.flag).join('  '), style: const TextStyle(fontSize: 22)),
              ],
            ),
          ),
        ),
      );
    }
    final items = _talk.reversed.toList();
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 16),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final m = items[i];
        final fromMe = m.from == _dir.mine;
        return Align(
          alignment: fromMe ? Alignment.centerRight : Alignment.centerLeft,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.86),
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GestureDetector(
                onTap: () => _speech.speak(m.translated, m.to),
                child: SpeechBubble(
                  color: fromMe ? MC.white : MC.yellow,
                  tailLeft: !fromMe,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('${m.from.flag} ➜ ${m.to.flag}', style: const TextStyle(fontSize: 15)),
                          const SizedBox(width: 6),
                          const Icon(Icons.volume_up, size: 18, color: MC.black),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        m.translated,
                        style: TextStyle(
                          fontSize: i == 0 ? 24 : 19,
                          fontWeight: FontWeight.w900,
                          color: MC.black,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        m.original,
                        style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic, color: Color(0xAA111111)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
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
    if (img == null || _live.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, cons) {
        final scale = [cons.maxWidth / img.width, cons.maxHeight / img.height].reduce((a, b) => a > b ? a : b);
        final dx = (cons.maxWidth - img.width * scale) / 2;
        final dy = (cons.maxHeight - img.height * scale) / 2;
        return Stack(
          children: [
            for (final b in _live)
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
      final to = _dir.mine;
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
                      Text('${_scanFrom?.flag ?? ''} ➜ ${to.flag}', style: const TextStyle(fontSize: 18)),
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
                            onTap: () => _speech.speak(tr, to),
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
    final status = _liveStatus ?? 'Inquadra un testo: lo traduco in ${_dir.mine.flag} ${_dir.mine.label}';
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
