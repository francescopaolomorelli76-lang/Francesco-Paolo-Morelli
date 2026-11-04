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
import 'setup_screen.dart';

enum Mode { talk, scan }

class _Msg {
  _Msg({required this.from, required this.to, required this.original, required this.translated});
  final Lang from, to;
  final String original, translated;
}

/// Un'unica schermata, un unico grande pulsante 3D al centro.
/// VOCE: tieni premuto e parla in qualsiasi lingua, lascia → traduce e legge.
/// SCANNER: tieni premuto e inquadra (traduzione dal vivo), lascia → foto
/// tradotta per intero. La lingua viene sempre riconosciuta da sola.
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
  List<(String, String)> _live = [];
  Lang? _liveLang;
  List<(String, String)>? _scanResult;
  (Lang, Lang)? _scanPair;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkSetup(firstRun: true));
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

  // ───────────────────────── setup ─────────────────────────

  Future<void> _checkSetup({bool firstRun = false}) async {
    final s = await SetupService.status();
    if (!mounted) return;
    setState(() => _ready = s.complete);
    if (!s.complete && firstRun) await _openSetup();
  }

  Future<void> _openSetup() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const SetupScreen()));
    await _checkSetup();
  }

  void _savePair() {
    Prefs.set('mine', _dir.mine);
    Prefs.set('partner', _dir.partner);
  }

  // ───────────────────────── pulsante ─────────────────────────

  void _onPress() {
    if (!_ready) {
      _ignoreRelease = true;
      _openSetup();
      return;
    }
    _ignoreRelease = false;
    _mode == Mode.talk ? _startTalk() : _startScan();
  }

  void _onRelease() {
    if (_ignoreRelease) return;
    _mode == Mode.talk ? _finishTalk() : _finishScan();
  }

  // ───────────────────────── voce ─────────────────────────

  Future<void> _startTalk() async {
    setState(() => _btn = PushState.recording);
    final ok = await _speech.startRecording();
    if (!ok && mounted) {
      setState(() => _btn = PushState.idle);
      _ignoreRelease = true;
      comicToast(context, 'Serve il permesso del microfono: attivalo nelle impostazioni del telefono.', color: MC.red);
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
          'Il microfono non riceve audio (${heard.debug}). Controlla Impostazioni › Manga Vox › Microfono e che nessun\'altra app lo stia usando.',
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
      _savePair();
      final out = await _tr.translate(text, from, to);
      if (!mounted) return;
      setState(() => _talk.add(_Msg(from: from, to: to, original: text, translated: out)));
      setState(() => _btn = PushState.idle);
      await _speech.speak(out, to);
    } catch (e) {
      if (mounted) comicToast(context, 'Qualcosa è andato storto: $e', color: MC.red);
    } finally {
      if (mounted && _btn != PushState.idle) setState(() => _btn = PushState.idle);
    }
  }

  // ───────────────────────── scanner ─────────────────────────

  Future<void> _setMode(Mode m) async {
    if (m == _mode || _btn != PushState.idle) return;
    setState(() => _mode = m);
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
    } on CameraException catch (e) {
      if (mounted) setState(() => _camError = 'Fotocamera non disponibile (${e.code}). Controlla i permessi.');
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

  Future<void> _startScan() async {
    final c = _cam;
    if (c == null || !c.value.isInitialized) {
      _ignoreRelease = true;
      return;
    }
    setState(() {
      _btn = PushState.recording;
      _scanResult = null;
      _live = [];
      _liveLang = null;
    });
    if (!c.value.isStreamingImages) await c.startImageStream(_onFrame);
  }

  Future<void> _onFrame(CameraImage image) async {
    final now = DateTime.now();
    if (_frameBusy || now.difference(_lastFrame) < const Duration(milliseconds: 600)) return;
    _frameBusy = true;
    _lastFrame = now;
    try {
      final input = _toInputImage(image);
      if (input == null) return;
      final blocks = OcrService.blocksOf(await _ocr.recognizer.processImage(input)).take(8).toList();
      if (blocks.isEmpty) return;
      final lang = await LangDetect.instance.detect(blocks.join(' '));
      if (lang == null) return;
      final to = _dir.targetFor(lang);
      final out = <(String, String)>[];
      for (final b in blocks) {
        final key = '${lang.name}>${to.name}:$b';
        out.add((b, _memo[key] ??= await _tr.translate(b, lang, to)));
      }
      if (_memo.length > 300) _memo.clear();
      if (mounted && _btn == PushState.recording) {
        setState(() {
          _live = out;
          _liveLang = lang;
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

  Future<void> _finishScan() async {
    final c = _cam;
    if (_btn != PushState.recording || c == null) return;
    setState(() => _btn = PushState.busy);
    try {
      if (c.value.isStreamingImages) await c.stopImageStream();
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
      final to = _dir.targetFor(from);
      final out = <(String, String)>[];
      for (final b in r.blocks) {
        out.add((b, await _tr.translate(b, from, to)));
      }
      if (mounted) {
        setState(() {
          _scanResult = out;
          _scanPair = (from, to);
        });
      }
    } catch (e) {
      if (mounted) comicToast(context, 'Scansione non riuscita: $e', color: MC.red);
    } finally {
      if (mounted) {
        setState(() {
          _btn = PushState.idle;
          _live = [];
        });
      }
    }
  }

  // ───────────────────────── UI ─────────────────────────

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final btnSize = (width * 0.5).clamp(150.0, 220.0);
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
          else
            _cameraLayer(),
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
                    icon: _mode == Mode.talk ? Icons.mic : Icons.center_focus_strong,
                    label: _ready ? 'TIENI\nPREMUTO' : 'PREPARA\nOFFLINE',
                    onPress: _onPress,
                    onRelease: _onRelease,
                  ),
                ),
                _statusLine(),
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
          icon: Icon(
            _ready ? Icons.offline_pin : Icons.download_for_offline,
            size: 30,
            color: _mode == Mode.scan ? MC.yellow : MC.black,
          ),
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

  /// Sotto il pulsante: chi parla cosa. La mia lingua si tocca per cambiarla.
  Widget _statusLine() {
    final onCam = _mode == Mode.scan;
    final txtColor = onCam ? MC.white : MC.black;
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: _btn == PushState.idle
                ? () async {
                    final l = await pickLanguage(context, _dir.mine);
                    if (l != null) {
                      setState(() => _dir.mine = l);
                      _savePair();
                    }
                  }
                : null,
            child: ComicPanel(
              color: MC.yellow,
              shadow: 3,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('IO ', style: comic(18)),
                  Text(_dir.mine.flag, style: const TextStyle(fontSize: 20)),
                  Text(' ${_dir.mine.short}', style: comic(18)),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Icon(Icons.sync_alt, color: txtColor, size: 26),
          ),
          ComicPanel(
            color: MC.cyan,
            shadow: 3,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_dir.partner.flag, style: const TextStyle(fontSize: 20)),
                Text(' ${_dir.partner.short} ', style: comic(18)),
                Text('AUTO', style: comic(13, color: MC.white)),
              ],
            ),
          ),
        ],
      ),
    );
  }

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
                const Text(
                  'In qualsiasi lingua: la riconosco da sola. Lascia il pulsante e traduco ad alta voce.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
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

  Widget _scanContent() {
    final maxH = MediaQuery.sizeOf(context).height * 0.42;
    Widget? panel;
    if (_btn == PushState.recording) {
      panel = _live.isEmpty
          ? Text('Inquadra il testo… ⚡  (per il russo lascia il pulsante)', style: comic(20))
          : _pairs(
              _live,
              header: _liveLang == null ? null : '${_liveLang!.flag} ➜ ${_dir.targetFor(_liveLang!).flag}  LIVE',
            );
    } else if (_scanResult != null) {
      final (from, to) = _scanPair!;
      panel = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('${from.flag} ➜ ${to.flag}', style: const TextStyle(fontSize: 18)),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _scanResult = null),
                child: const Icon(Icons.close, size: 26, color: MC.black),
              ),
            ],
          ),
          const Divider(color: MC.black, thickness: 2),
          Flexible(child: _pairs(_scanResult!, speakIn: to)),
        ],
      );
    } else if (_btn == PushState.idle) {
      panel = Text(
        'Inquadra un cartello o un menù e TIENI PREMUTO. Lascia per tradurre la foto intera.',
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
      );
    }
    return Align(
      alignment: Alignment.bottomCenter,
      child: panel == null
          ? const SizedBox.shrink()
          : Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: maxH),
                child: ComicPanel(color: MC.paper, child: panel),
              ),
            ),
    );
  }

  Widget _pairs(List<(String, String)> items, {String? header, Lang? speakIn}) => ListView(
    shrinkWrap: true,
    padding: EdgeInsets.zero,
    children: [
      if (header != null) Text(header, style: comic(16)),
      for (final (orig, tr) in items)
        InkWell(
          onTap: speakIn == null ? null : () => _speech.speak(tr, speakIn),
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
                  style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: Color(0x99111111)),
                ),
              ],
            ),
          ),
        ),
    ],
  );
}
