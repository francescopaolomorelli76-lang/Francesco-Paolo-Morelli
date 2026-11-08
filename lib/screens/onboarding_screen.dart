import 'dart:async';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../ui/manga.dart';

/// Una pagina dell'introduzione: immagine e, se serve, una scritta disegnata
/// dall'app sopra l'immagine (per le immagini senza testo proprio).
class _Slide {
  const _Slide(this.image, {this.caption});
  final String image;
  final String? caption;
}

/// Introduzione animata: 5 immagini manga da scorrere, con la musica di
/// Manga Vox in loop, prima di arrivare all'app vera e propria.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.next, this.playMusic = true});

  /// Schermata che si apre alla fine dell'introduzione.
  final Widget next;
  final bool playMusic;

  static const slides = [
    _Slide('assets/onboarding/intro1.jpg', caption: 'TRADUCI IN 59 LINGUE!'),
    _Slide('assets/onboarding/intro2.jpg'),
    _Slide('assets/onboarding/intro3.jpg'),
    _Slide('assets/onboarding/intro4.jpg'),
    _Slide('assets/onboarding/intro5.jpg', caption: 'BASTA STRESS.\nTRADUCI ANCHE OFFLINE!'),
  ];

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with TickerProviderStateMixin {
  final _pages = PageController();
  late final AnimationController _kenBurns = AnimationController(vsync: this, duration: const Duration(seconds: 7))
    ..repeat(reverse: true);
  late final AnimationController _pop = AnimationController(vsync: this, duration: const Duration(milliseconds: 550))
    ..forward();

  AudioPlayer? _player;
  bool _muted = false;
  bool _leaving = false;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    if (widget.playMusic) _startMusic();
  }

  Future<void> _startMusic() async {
    try {
      final p = AudioPlayer();
      _player = p;
      await p.setReleaseMode(ReleaseMode.loop);
      await p.setVolume(0.75);
      await p.play(AssetSource('audio/intro.mp3'));
    } catch (_) {
      // Senza audio l'introduzione funziona lo stesso.
    }
  }

  /// Abbassa piano piano la musica e la ferma.
  Future<void> _fadeOutMusic() async {
    final p = _player;
    if (p == null) return;
    try {
      for (var v = 0.75; v > 0; v -= 0.08) {
        await p.setVolume(v);
        await Future.delayed(const Duration(milliseconds: 45));
      }
      await p.stop();
      await p.dispose();
    } catch (_) {}
    _player = null;
  }

  Future<void> _toggleMute() async {
    setState(() => _muted = !_muted);
    try {
      await _player?.setVolume(_muted ? 0 : 0.75);
    } catch (_) {}
  }

  @override
  void dispose() {
    _player?.dispose();
    _pages.dispose();
    _kenBurns.dispose();
    _pop.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    if (_leaving) return;
    _leaving = true;
    HapticFeedback.mediumImpact();
    unawaited(_fadeOutMusic());
    if (!mounted) return;
    await Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (_, _, _) => widget.next,
        transitionsBuilder: (_, anim, _, child) => FadeTransition(
          opacity: anim,
          child: ScaleTransition(scale: Tween(begin: 1.08, end: 1.0).animate(anim), child: child),
        ),
      ),
    );
  }

  void _nextPage() {
    HapticFeedback.selectionClick();
    if (_page >= OnboardingScreen.slides.length - 1) {
      _finish();
    } else {
      _pages.nextPage(duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic);
    }
  }

  @override
  Widget build(BuildContext context) {
    final last = _page == OnboardingScreen.slides.length - 1;
    return Scaffold(
      backgroundColor: MC.paper,
      body: HalftoneBackground(
        child: SafeArea(
          child: Column(
            children: [
              // In alto: musica sì/no e "Salta".
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: _muted ? 'Accendi la musica' : 'Spegni la musica',
                      onPressed: _toggleMute,
                      icon: Icon(_muted ? Icons.volume_off : Icons.music_note, color: MC.black, size: 28),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: _finish,
                      child: Text('SALTA ›', style: comic(22)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pages,
                  itemCount: OnboardingScreen.slides.length,
                  onPageChanged: (i) {
                    setState(() => _page = i);
                    _pop.forward(from: 0);
                  },
                  itemBuilder: (_, i) => _slide(i),
                ),
              ),
              _dots(),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 10, 24, 14),
                child: _BlueButton(
                  label: last ? 'ENTRA NELL\'APP!' : (_page == 0 ? 'INIZIA' : 'CONTINUA'),
                  onTap: _nextPage,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Una pagina: zoom lento ("Ken Burns"), profondità durante lo scorrimento
  /// e scritta che salta fuori.
  Widget _slide(int i) {
    final s = OnboardingScreen.slides[i];
    return AnimatedBuilder(
      animation: Listenable.merge([_pages, _kenBurns]),
      builder: (context, _) {
        var delta = 0.0;
        if (_pages.hasClients && _pages.position.haveDimensions) {
          delta = (_pages.page ?? _page.toDouble()) - i;
        }
        final zoom = 1.0 + 0.05 * Curves.easeInOut.transform(_kenBurns.value);
        final drift = math.sin(_kenBurns.value * math.pi) * 6;
        return Opacity(
          opacity: (1 - delta.abs() * 0.6).clamp(0.0, 1.0),
          child: Transform.translate(
            offset: Offset(delta * 60, 0),
            child: Transform.scale(
              scale: 1 - delta.abs() * 0.08,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Transform.translate(
                          offset: Offset(drift, -drift / 2),
                          child: Transform.scale(
                            scale: zoom,
                            child: Image.asset(s.image, fit: BoxFit.contain, alignment: Alignment.topCenter),
                          ),
                        ),
                      ),
                    ),
                    if (s.caption != null && i == _page) _caption(s.caption!),
                    if (s.caption != null && i != _page) const SizedBox(height: 96),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _caption(String text) => ScaleTransition(
    scale: CurvedAnimation(parent: _pop, curve: Curves.elasticOut),
    child: Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 10),
      child: Transform.rotate(
        angle: -0.03,
        child: ComicPanel(
          color: MC.yellow,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 26,
              height: 1.1,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              color: MC.black,
            ),
          ),
        ),
      ),
    ),
  );

  Widget _dots() => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      for (var i = 0; i < OnboardingScreen.slides.length; i++)
        AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 5),
          width: i == _page ? 26 : 14,
          height: 14,
          decoration: BoxDecoration(
            color: i == _page ? const Color(0xFF1E6FE8) : MC.white,
            border: Border.all(color: MC.black, width: 2.5),
            borderRadius: BorderRadius.circular(10),
          ),
        ),
    ],
  );
}

/// Il grande pulsante blu delle immagini, che si abbassa quando lo premi.
class _BlueButton extends StatefulWidget {
  const _BlueButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  State<_BlueButton> createState() => _BlueButtonState();
}

class _BlueButtonState extends State<_BlueButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: widget.label,
    child: GestureDetector(
      onTapDown: (_) => setState(() => _down = true),
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) {
        setState(() => _down = false);
        widget.onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        height: 64,
        transform: Matrix4.translationValues(0, _down ? 5 : 0, 0),
        decoration: BoxDecoration(
          color: const Color(0xFF1E6FE8),
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: MC.black, width: 4),
          boxShadow: [BoxShadow(color: MC.black, offset: Offset(0, _down ? 1 : 6))],
        ),
        alignment: Alignment.center,
        child: Text(
          widget.label,
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: MC.white, letterSpacing: 1),
        ),
      ),
    ),
  );
}
