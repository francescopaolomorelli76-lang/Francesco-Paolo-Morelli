import 'dart:async';

import 'package:flutter/material.dart';
import 'package:volume_controller/volume_controller.dart';

import '../languages.dart';
import '../services/live_speech.dart';
import '../services/speech_service.dart';
import '../ui/manga.dart';

/// Pannello AUDIO: tutto quello che serve per sentire e farsi sentire,
/// senza passare dalle impostazioni dell'iPhone.
/// - microfono e riconoscimento vocale: stato e attivazione
/// - prova microfono con indicatore del volume
/// - volume del telefono, volume e velocità della voce, prova voce
class AudioScreen extends StatefulWidget {
  const AudioScreen({super.key, required this.mine});
  final Lang mine;

  @override
  State<AudioScreen> createState() => _AudioScreenState();
}

class _AudioScreenState extends State<AudioScreen> with WidgetsBindingObserver {
  final _live = LiveSpeech.instance;
  final _speech = SpeechService.instance;
  MicPermissions? _perm;
  double? _sysVolume;
  StreamSubscription<double>? _volSub;
  bool _testing = false;
  double _testPeak = -160;
  String? _testResult;

  static const _sample = {
    Lang.it: 'Ciao! Mi senti bene?',
    Lang.en: 'Hello! Can you hear me well?',
    Lang.de: 'Hallo! Hörst du mich gut?',
    Lang.fr: 'Salut ! Tu m\'entends bien ?',
    Lang.ru: 'Привет! Ты меня хорошо слышишь?',
    Lang.zh: '你好！你能听清楚我吗？',
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    try {
      VolumeController.instance.showSystemUI = false;
      _volSub = VolumeController.instance.addListener((v) {
        if (mounted) setState(() => _sysVolume = v);
      }, fetchInitialVolume: true);
    } catch (_) {}
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _volSub?.cancel();
    try {
      VolumeController.instance.removeListener();
    } catch (_) {}
    if (_testing) _live.cancel();
    super.dispose();
  }

  // Al ritorno dalle impostazioni dell'iPhone, aggiorna lo stato.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    try {
      final p = await _live.permissions();
      if (mounted) setState(() => _perm = p);
    } catch (_) {}
  }

  Future<void> _activate() async {
    final p = _perm;
    if (p != null && p.denied) {
      await _live.openSettings();
      return;
    }
    final r = await _live.request();
    if (mounted) setState(() => _perm = r);
  }

  Future<void> _testStart() async {
    setState(() {
      _testing = true;
      _testResult = null;
    });
    final ok = await _live.start(null);
    if (!ok && mounted) {
      setState(() => _testing = false);
      await _refresh();
    }
  }

  Future<void> _testStop() async {
    if (!_testing) return;
    final r = await _live.stop();
    await LiveSpeech.deleteAudio(r.audioPath);
    if (!mounted) return;
    setState(() {
      _testing = false;
      _testPeak = r.peakDb;
      _testResult = r.tooShort
          ? 'Tieni premuto mentre parli.'
          : r.peakDb > -35
          ? '✅ TI SENTO BENISSIMO!'
          : r.peakDb > -50
          ? '⚠️ Ti sento piano: avvicina il telefono alla bocca.'
          : '❌ Non sento niente: controlla che il microfono non sia coperto o usato da un\'altra app.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = _perm;
    return Scaffold(
      backgroundColor: MC.paper,
      appBar: AppBar(
        backgroundColor: MC.black,
        foregroundColor: MC.yellow,
        title: const OutlinedTitle('AUDIO', size: 28, stroke: 4),
      ),
      body: HalftoneBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ───── Microfono
            _section('🎤 MICROFONO'),
            ComicPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _status('Microfono', p?.mic),
                  _status('Riconoscimento vocale', p?.speech),
                  if (p != null && !p.ok) ...[
                    const SizedBox(height: 10),
                    Center(
                      child: ComicButton(
                        label: p.denied ? 'APRI PERMESSI MANGA VOX' : 'ATTIVA MICROFONO',
                        icon: Icons.mic,
                        color: MC.red,
                        textColor: MC.white,
                        onTap: _activate,
                      ),
                    ),
                    if (p.denied)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'Erano stati negati: si apre la pagina di Manga Vox, attiva Microfono e Riconoscimento vocale e torna qui.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ),
                  ],
                  const Divider(color: MC.black, thickness: 2, height: 24),
                  const Text('PROVA: tieni premuto e parla', style: TextStyle(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Listener(
                        onPointerDown: (_) => _testStart(),
                        onPointerUp: (_) => _testStop(),
                        onPointerCancel: (_) => _testStop(),
                        child: ComicPanel(
                          color: _testing ? MC.red : MC.yellow,
                          shadow: 3,
                          padding: const EdgeInsets.all(12),
                          child: Icon(_testing ? Icons.graphic_eq : Icons.mic, size: 30, color: MC.black),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ValueListenableBuilder<double>(
                          valueListenable: _live.level,
                          builder: (_, lvl, _) => ComicPanel(
                            padding: EdgeInsets.zero,
                            shadow: 2,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(
                                value: _testing ? lvl : ((_testPeak + 55) / 45).clamp(0.0, 1.0),
                                minHeight: 26,
                                backgroundColor: MC.white,
                                color: (_testing ? lvl : 0.0) > 0.85 ? MC.red : const Color(0xFF2A9D3F),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_testResult != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(_testResult!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ───── Volume
            _section('🔊 VOLUME E VOCE'),
            ComicPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_sysVolume != null) ...[
                    const Text('Volume del telefono', style: TextStyle(fontWeight: FontWeight.w900)),
                    _slider(_sysVolume!, (v) {
                      setState(() => _sysVolume = v);
                      VolumeController.instance.setVolume(v);
                    }),
                  ],
                  const Text('Volume della traduzione', style: TextStyle(fontWeight: FontWeight.w900)),
                  _slider(_speech.volume, (v) => setState(() => _speech.setVolume(v))),
                  const Text('Velocità della voce', style: TextStyle(fontWeight: FontWeight.w900)),
                  _slider(_speech.rate, (v) => setState(() => _speech.setRate(v)), min: 0.3, max: 0.65),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    activeThumbColor: MC.red,
                    title: const Text(
                      'Leggi ad alta voce la traduzione',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                    value: _speech.speakAloud,
                    onChanged: (v) => setState(() => _speech.setSpeakAloud(v)),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: ComicButton(
                      label: 'PROVA VOCE',
                      icon: Icons.volume_up,
                      onTap: () => _speech.speak(_sample[widget.mine]!, widget.mine, force: true),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Suggerimento: se la voce è bassa, togli il silenzioso e alza il volume del telefono qui sopra.',
                    style: TextStyle(fontSize: 13, color: Color(0xAA111111), fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(t, style: comic(24)),
  );

  Widget _slider(double v, ValueChanged<double> onChanged, {double min = 0, double max = 1}) => Slider(
    value: v.clamp(min, max),
    min: min,
    max: max,
    activeColor: MC.red,
    inactiveColor: const Color(0x33111111),
    onChanged: onChanged,
  );

  Widget _status(String label, String? state) {
    final ok = state == 'granted';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            state == null ? Icons.hourglass_empty : (ok ? Icons.check_circle : Icons.cancel),
            color: ok ? const Color(0xFF2A9D3F) : MC.red,
            size: 26,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          ),
          Text(
            state == null ? '…' : (ok ? 'ATTIVO' : (state == 'denied' ? 'NEGATO' : 'DA ATTIVARE')),
            style: comic(18, color: ok ? const Color(0xFF2A9D3F) : MC.red),
          ),
        ],
      ),
    );
  }
}
