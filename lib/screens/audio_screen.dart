import 'dart:async';

import 'package:flutter/material.dart';
import 'package:volume_controller/volume_controller.dart';

import '../languages.dart';
import '../services/langs.dart';
import '../services/live_speech.dart';
import '../services/pitch.dart';
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
  late Lang _voiceLang = widget.mine;
  List<TtsVoice>? _voices;

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
    _loadVoices();
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
    if (state == AppLifecycleState.resumed) {
      _refresh();
      _speech.refreshVoices();
      _loadVoices();
    }
  }

  Future<void> _refresh() async {
    try {
      final p = await _live.permissions();
      if (mounted) setState(() => _perm = p);
    } catch (_) {}
  }

  Future<void> _loadVoices() async {
    final v = await _speech.voicesFor(_voiceLang);
    if (mounted) setState(() => _voices = v);
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
                      onTap: () => _speech.speak(_sample[widget.mine] ?? widget.mine.label, widget.mine, force: true),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Suggerimento: se la voce è bassa, togli il silenzioso e alza il volume del telefono qui sopra '
                    '(la traduzione usa sempre l\'altoparlante a volume pieno).',
                    style: TextStyle(fontSize: 13, color: Color(0xAA111111), fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ───── Voci
            _section('🗣 VOCI'),
            _voicesPanel(),
          ],
        ),
      ),
    );
  }

  Widget _voicesPanel() {
    final voices = _voices;
    final auto = _speech.autoGender;
    return ComicPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            activeThumbColor: MC.red,
            title: const Text('Uomo o donna come chi parla', style: TextStyle(fontWeight: FontWeight.w900)),
            subtitle: const Text('Riconosco dal tono se parla un uomo o una donna e uso una voce simile.'),
            value: auto,
            onChanged: (v) => setState(() => _speech.setAutoGender(v)),
          ),
          Row(
            children: [
              Expanded(
                child: Text(
                  auto ? 'Se non lo riconosco, uso:' : 'Voce da usare:',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              for (final g in VoiceGender.values)
                Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: ComicButton(
                    label: g == VoiceGender.female ? '♀ DONNA' : '♂ UOMO',
                    size: 15,
                    color: _speech.defaultGender == g ? MC.yellow : MC.white,
                    onTap: () => setState(() => _speech.setDefaultGender(g)),
                  ),
                ),
            ],
          ),
          const Divider(color: MC.black, thickness: 2, height: 24),
          const Text('Scegli la voce per ogni lingua', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final l in Langs.installed)
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _voiceLang = l;
                      _voices = null;
                    });
                    _loadVoices();
                  },
                  child: ComicPanel(
                    color: l == _voiceLang ? MC.yellow : MC.white,
                    shadow: 2,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Text('${l.flag} ${l.short}', style: comic(18)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (voices == null)
            const Center(child: CircularProgressIndicator(color: MC.black))
          else if (voices.isEmpty)
            Text('Nessuna voce ${_voiceLang.label} installata sul telefono.')
          else
            for (final g in VoiceGender.values) ..._genderVoices(g, voices),
          const SizedBox(height: 8),
          const Text(
            'Voci più naturali (non robotiche): sull\'iPhone vai in Impostazioni › Accessibilità › Contenuto letto › Voci, '
            'scegli la lingua e scarica una voce "Migliorata" o "Premium". Poi torna qui: la trovi nell\'elenco e la uso da sola.',
            style: TextStyle(fontSize: 13, color: Color(0xAA111111), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  List<Widget> _genderVoices(VoiceGender g, List<TtsVoice> all) {
    final list = all.where((v) => v.gender == g || v.gender == null).toList();
    if (list.isEmpty) return [];
    final chosen = _speech.chosenVoiceId(_voiceLang, g);
    Widget tile(String title, String? badge, String id, TtsVoice? voice) => InkWell(
      onTap: () {
        setState(() => _speech.setChosenVoice(_voiceLang, g, id));
        if (voice != null) {
          _speech.speak(_sample[_voiceLang] ?? _voiceLang.label, _voiceLang, voice: voice, force: true);
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Icon(chosen == id ? Icons.radio_button_checked : Icons.radio_button_off, color: MC.black),
            const SizedBox(width: 8),
            Expanded(
              child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: badge.startsWith('⭐') ? MC.yellow : (badge == 'Migliorata' ? MC.cyan : MC.white),
                  border: Border.all(color: MC.black, width: 1.5),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(badge, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              ),
            if (voice != null) const Icon(Icons.play_arrow, color: MC.black),
          ],
        ),
      ),
    );
    return [
      Padding(
        padding: const EdgeInsets.only(top: 6, bottom: 2),
        child: Text(g == VoiceGender.female ? '♀ VOCE DONNA' : '♂ VOCE UOMO', style: comic(18, color: MC.red)),
      ),
      tile('Automatica (la migliore installata)', null, '', null),
      for (final v in list) tile('${v.name}  (${v.locale})', v.qualityLabel, v.id, v),
    ];
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
