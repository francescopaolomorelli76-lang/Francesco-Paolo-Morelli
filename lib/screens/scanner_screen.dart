import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';

import '../languages.dart';
import '../services/ocr_service.dart';
import '../services/prefs.dart';
import '../services/translator_service.dart';
import '../ui/manga.dart';
import 'languages_screen.dart';
import 'scan_result_screen.dart';

/// Scanner: inquadra un testo e vedi la traduzione in tempo reale,
/// oppure scatta una foto per una traduzione completa.
class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with WidgetsBindingObserver {
  final _tr = TranslatorService.instance;
  final _ocr = OcrService.instance;

  late Lang _from = Prefs.get('scan_from', Lang.en);
  late Lang _to = Prefs.get('scan_to', Lang.it);

  CameraController? _cam;
  String? _camError;
  bool _live = true;
  bool _processing = false;
  bool _shooting = false;
  bool _modelsOk = true;
  DateTime _lastFrame = DateTime.fromMillisecondsSinceEpoch(0);
  final Map<String, String> _memo = {};
  List<(String, String)> _liveResults = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkModels();
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeCamera();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _disposeCamera();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _checkModels() async {
    final missing = await _tr.missing({_from, _to});
    if (mounted) setState(() => _modelsOk = missing.isEmpty);
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
      if (!mounted) {
        await c.dispose();
        return;
      }
      setState(() {
        _cam = c;
        _camError = null;
      });
      _syncStream();
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

  bool get _liveAvailable => !_from.usesNativeOcr;

  Future<void> _syncStream() async {
    final c = _cam;
    if (c == null || !c.value.isInitialized) return;
    final want = _live && _liveAvailable && _modelsOk && !_shooting;
    if (want && !c.value.isStreamingImages) {
      await c.startImageStream(_onFrame);
    } else if (!want && c.value.isStreamingImages) {
      await c.stopImageStream();
    }
  }

  Future<void> _onFrame(CameraImage image) async {
    final now = DateTime.now();
    if (_processing || now.difference(_lastFrame) < const Duration(milliseconds: 700)) return;
    _processing = true;
    _lastFrame = now;
    try {
      final input = _toInputImage(image);
      if (input == null) return;
      final from = _from, to = _to;
      final recognized = await _ocr.recognizerFor(from).processImage(input);
      final blocks = OcrService.blocksOf(recognized).take(8).toList();
      final out = <(String, String)>[];
      for (final b in blocks) {
        final key = '${from.name}>${to.name}:$b';
        final t = _memo[key] ??= await _tr.translate(b, from, to);
        out.add((b, t));
      }
      if (_memo.length > 300) _memo.clear();
      if (mounted && from == _from && to == _to) setState(() => _liveResults = out);
    } catch (_) {
      // Un fotogramma andato male non deve fermare lo scanner.
    } finally {
      _processing = false;
    }
  }

  InputImage? _toInputImage(CameraImage image) {
    final c = _cam;
    if (c == null) return null;
    // App bloccata in verticale: la rotazione coincide con l'orientamento del sensore.
    final rotation = InputImageRotationValue.fromRawValue(c.description.sensorOrientation);
    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (rotation == null || format == null) return null;
    if (Platform.isAndroid && format != InputImageFormat.nv21) return null;
    if (Platform.isIOS && format != InputImageFormat.bgra8888) return null;
    if (image.planes.length != 1) return null;
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

  Future<bool> _ensureModels() async {
    if (_modelsOk) return true;
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const LanguagesScreen()));
    await _checkModels();
    _syncStream();
    return _modelsOk;
  }

  Future<void> _shoot() async {
    final c = _cam;
    if (c == null || _shooting) return;
    if (!await _ensureModels()) return;
    setState(() => _shooting = true);
    try {
      await _syncStream();
      final file = await c.takePicture();
      await _openResult(file.path);
    } catch (e) {
      if (mounted) comicToast(context, 'Scatto non riuscito: $e', color: MC.red);
    } finally {
      if (mounted) {
        setState(() => _shooting = false);
        _syncStream();
      }
    }
  }

  Future<void> _gallery() async {
    if (!await _ensureModels()) return;
    final x = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (x != null) await _openResult(x.path);
  }

  Future<void> _openResult(String path) async {
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ScanResultScreen(imagePath: path, from: _from, to: _to)),
    );
  }

  void _setLangs(Lang from, Lang to) {
    setState(() {
      _from = from;
      _to = to;
      _liveResults = [];
    });
    Prefs.set('scan_from', from);
    Prefs.set('scan_to', to);
    _checkModels().then((_) => _syncStream());
  }

  @override
  Widget build(BuildContext context) {
    final c = _cam;
    return Container(
      color: MC.black,
      child: Stack(fit: StackFit.expand, children: [
        if (c != null && c.value.isInitialized)
          ClipRect(
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: c.value.previewSize?.height ?? 1,
                height: c.value.previewSize?.width ?? 1,
                child: CameraPreview(c),
              ),
            ),
          )
        else
          HalftoneBackground(
            color: const Color(0xFF222222),
            dotColor: const Color(0x33FFFFFF),
            speedLines: true,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: _camError == null
                    ? const CircularProgressIndicator(color: MC.yellow)
                    : ComicPanel(color: MC.red, child: Text(_camError!, style: comic(22, color: MC.white))),
              ),
            ),
          ),
        SafeArea(
          child: Column(children: [
            _topBar(),
            if (!_modelsOk)
              Padding(
                padding: const EdgeInsets.all(12),
                child: GestureDetector(
                  onTap: _ensureModels,
                  child: const ComicPanel(
                    color: MC.red,
                    child: Text('Lingue non scaricate: tocca qui per scaricarle (una volta sola).',
                        style: TextStyle(color: MC.white, fontWeight: FontWeight.w800)),
                  ),
                ),
              ),
            const Spacer(),
            if (_live) _livePanel(),
            _bottomBar(),
          ]),
        ),
      ]),
    );
  }

  Widget _topBar() => Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Row(children: [
          LangPicker(value: _from, onChanged: (l) => _setLangs(l, _to)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: GestureDetector(
              onTap: () => _setLangs(_to, _from),
              child: const Icon(Icons.double_arrow_rounded, color: MC.yellow, size: 36,
                  shadows: [Shadow(color: MC.black, offset: Offset(2, 2))]),
            ),
          ),
          LangPicker(value: _to, color: MC.yellow, onChanged: (l) => _setLangs(_from, l)),
          const Spacer(),
          GestureDetector(
            onTap: () {
              setState(() => _live = !_live);
              _syncStream();
            },
            child: ComicPanel(
              color: _live ? MC.red : MC.white,
              shadow: 4,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              child: Text('LIVE', style: comic(22, color: _live ? MC.white : MC.black)),
            ),
          ),
        ]),
      );

  Widget _livePanel() {
    Widget body;
    if (!_liveAvailable) {
      body = Text('Per il russo usa SCATTA! — lettura del cirillico dalla foto.',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700));
    } else if (_liveResults.isEmpty) {
      body = Text('Inquadra un testo… ⚡', style: comic(24));
    } else {
      body = ListView.separated(
        shrinkWrap: true,
        padding: EdgeInsets.zero,
        itemCount: _liveResults.length,
        separatorBuilder: (_, _) => const Divider(color: MC.black, thickness: 2, height: 14),
        itemBuilder: (_, i) {
          final (orig, tr) = _liveResults[i];
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(tr, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: MC.black)),
            Text(orig,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: Color(0x99111111))),
          ]);
        },
      );
    }
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.36),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: ComicPanel(color: MC.paper, child: body),
      ),
    );
  }

  Widget _bottomBar() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          ComicButton(label: 'FOTO', icon: Icons.photo_library, color: MC.white, onTap: _gallery),
          BurstButton(
            label: 'SCATTA!',
            icon: Icons.camera_alt,
            size: 120,
            busy: _shooting,
            onTap: _cam == null ? null : _shoot,
          ),
          ComicButton(
            label: 'LINGUE',
            icon: Icons.download_for_offline,
            color: MC.cyan,
            onTap: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const LanguagesScreen()));
              await _checkModels();
              _syncStream();
            },
          ),
        ]),
      );
}
