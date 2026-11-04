import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'manga.dart';

enum PushState { idle, recording, busy, disabled }

/// Il grande pulsante tridimensionale al centro dello schermo.
/// Tieni premuto → [onPress]; lascia → [onRelease].
/// È un cilindro disegnato in stile fumetto: quando lo premi la faccia
/// scende davvero dentro il corpo del pulsante.
class PushButton3D extends StatefulWidget {
  const PushButton3D({
    super.key,
    required this.state,
    required this.onPress,
    required this.onRelease,
    this.onCancel,
    this.label = 'TIENI\nPREMUTO',
    this.icon = Icons.mic,
    this.size = 210,
    this.level = 0,
  });

  /// Volume del microfono 0..1: anima le barre mentre registra.
  final double level;

  final PushState state;
  final VoidCallback onPress;
  final VoidCallback onRelease;
  final VoidCallback? onCancel;
  final String label;
  final IconData icon;
  final double size;

  @override
  State<PushButton3D> createState() => _PushButton3DState();
}

class _PushButton3DState extends State<PushButton3D> with TickerProviderStateMixin {
  late final AnimationController _press = AnimationController(vsync: this, duration: const Duration(milliseconds: 90));
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );
  bool _down = false;

  @override
  void initState() {
    super.initState();
    _syncPulse();
  }

  @override
  void didUpdateWidget(PushButton3D old) {
    super.didUpdateWidget(old);
    _syncPulse();
    if (widget.state != PushState.recording && !_down) _press.reverse();
  }

  void _syncPulse() {
    final rec = widget.state == PushState.recording || widget.state == PushState.busy;
    if (rec && !_pulse.isAnimating) {
      _pulse.repeat();
    } else if (!rec && _pulse.isAnimating) {
      _pulse.stop();
      _pulse.value = 0;
    }
  }

  @override
  void dispose() {
    _press.dispose();
    _pulse.dispose();
    super.dispose();
  }

  bool get _enabled => widget.state == PushState.idle || widget.state == PushState.recording;

  void _onDown(PointerDownEvent _) {
    if (widget.state != PushState.idle) return;
    _down = true;
    _press.forward();
    HapticFeedback.heavyImpact();
    widget.onPress();
  }

  void _onUp(PointerUpEvent _) {
    if (!_down) return;
    _down = false;
    _press.reverse();
    HapticFeedback.mediumImpact();
    widget.onRelease();
  }

  void _onCancel(PointerCancelEvent _) {
    if (!_down) return;
    _down = false;
    _press.reverse();
    (widget.onCancel ?? widget.onRelease)();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final depth = s * 0.12;
    final (face, side, ink) = switch (widget.state) {
      PushState.recording => (MC.red, const Color(0xFF9E1B26), MC.white),
      PushState.busy => (MC.cyan, const Color(0xFF00708A), MC.black),
      PushState.disabled => (const Color(0xFFDDDDDD), const Color(0xFF9A9A9A), const Color(0xFF777777)),
      PushState.idle => (MC.yellow, const Color(0xFFC79A00), MC.black),
    };
    final label = switch (widget.state) {
      PushState.recording => 'TI\nASCOLTO!',
      PushState.busy => 'TRADUCO…',
      _ => widget.label,
    };

    return Semantics(
      button: true,
      enabled: _enabled,
      label: 'Tieni premuto per parlare, lascia per tradurre',
      child: Listener(
        onPointerDown: _onDown,
        onPointerUp: _onUp,
        onPointerCancel: _onCancel,
        child: SizedBox(
          width: s * 1.35,
          height: s * 1.35 + depth,
          child: AnimatedBuilder(
            animation: Listenable.merge([_press, _pulse]),
            builder: (context, _) {
              final f = depth * (0.15 + 0.85 * Curves.easeOut.transform(_press.value));
              return CustomPaint(
                painter: _CylinderPainter(
                  face: face,
                  side: side,
                  depth: depth,
                  offset: f,
                  radius: s / 2,
                  pulse: _pulse.isAnimating ? _pulse.value : null,
                  pulseColor: widget.state == PushState.busy ? MC.cyan : MC.red,
                ),
                child: Center(
                  child: Transform.translate(
                    offset: Offset(0, f - depth / 2),
                    child: SizedBox.square(
                      dimension: s * 0.8,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (widget.state == PushState.busy)
                            SizedBox.square(
                              dimension: s * 0.2,
                              child: CircularProgressIndicator(strokeWidth: 6, color: ink),
                            )
                          else if (widget.state == PushState.recording)
                            _Bars(level: widget.level, color: ink, size: s * 0.24)
                          else
                            Icon(widget.icon, size: s * 0.24, color: ink),
                          SizedBox(height: s * 0.03),
                          Text(
                            label,
                            textAlign: TextAlign.center,
                            style: comic(s * 0.105, color: ink),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _CylinderPainter extends CustomPainter {
  _CylinderPainter({
    required this.face,
    required this.side,
    required this.depth,
    required this.offset,
    required this.radius,
    required this.pulse,
    required this.pulseColor,
  });

  final Color face, side, pulseColor;
  final double depth, offset, radius;
  final double? pulse;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2 - depth / 2;
    final r = radius;
    final ink = Paint()
      ..color = MC.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeJoin = StrokeJoin.round;

    // Onde d'urto mentre registra o traduce.
    if (pulse != null) {
      for (var i = 0; i < 2; i++) {
        final t = (pulse! + i * 0.5) % 1.0;
        canvas.drawCircle(
          Offset(cx, cy + depth / 2),
          r * (1.0 + t * 0.32),
          Paint()
            ..color = pulseColor.withValues(alpha: (1 - t) * 0.8)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 7 * (1 - t) + 1,
        );
      }
      // Linee cinetiche a raggiera.
      final lines = Paint()
        ..color = MC.black.withValues(alpha: 0.75)
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round;
      for (var i = 0; i < 16; i++) {
        final a = i / 16 * math.pi * 2 + 0.1;
        final wob = math.sin((pulse! * 2 + i * 0.37) * math.pi * 2) * 0.03;
        final r1 = r * (1.12 + wob), r2 = r * (1.27 + wob);
        canvas.drawLine(
          Offset(cx + math.cos(a) * r1, cy + depth / 2 + math.sin(a) * r1),
          Offset(cx + math.cos(a) * r2, cy + depth / 2 + math.sin(a) * r2),
          lines,
        );
      }
    }

    // Ombra piena sul "pavimento".
    canvas.drawCircle(Offset(cx + 8, cy + depth + 8), r, Paint()..color = MC.black);

    // Corpo del cilindro (fianco visibile sotto la faccia).
    final body = Path()
      ..moveTo(cx - r, cy + offset)
      ..lineTo(cx - r, cy + depth)
      ..arcTo(Rect.fromCircle(center: Offset(cx, cy + depth), radius: r), math.pi, -math.pi, false)
      ..lineTo(cx + r, cy + offset)
      ..close();
    canvas.drawPath(body, Paint()..color = side);
    // Righe verticali "a incisione" sul fianco.
    canvas.save();
    canvas.clipPath(body);
    final hatch = Paint()
      ..color = MC.black.withValues(alpha: 0.25)
      ..strokeWidth = 2;
    for (var x = cx - r; x < cx + r; x += 9) {
      canvas.drawLine(Offset(x, cy), Offset(x, cy + depth + r), hatch);
    }
    canvas.restore();
    canvas.drawPath(body, ink);

    // Faccia superiore.
    final c = Offset(cx, cy + offset);
    final faceRect = Rect.fromCircle(center: c, radius: r);
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.35, -0.45),
          radius: 1.0,
          colors: [Color.lerp(face, Colors.white, 0.45)!, face, Color.lerp(face, Colors.black, 0.12)!],
          stops: const [0.0, 0.55, 1.0],
        ).createShader(faceRect),
    );
    // Retino a puntini nella parte bassa della faccia.
    canvas.save();
    canvas.clipPath(Path()..addOval(faceRect));
    final dot = Paint()..color = MC.black.withValues(alpha: 0.13);
    for (double y = c.dy - r; y < c.dy + r; y += 10) {
      for (double x = c.dx - r + ((y ~/ 10).isOdd ? 5 : 0); x < c.dx + r; x += 10) {
        final k = ((y - c.dy) / r + 0.2).clamp(0.0, 1.0);
        if (k > 0) canvas.drawCircle(Offset(x, y), 0.4 + k * 2.4, dot);
      }
    }
    canvas.restore();
    // Riflesso lucido.
    canvas.drawArc(
      Rect.fromCircle(center: c, radius: r * 0.78),
      math.pi * 1.08,
      math.pi * 0.42,
      false,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.85)
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 0.07
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawCircle(c, r, ink);
    // Anello interno.
    canvas.drawCircle(
      c,
      r * 0.9,
      Paint()
        ..color = MC.black.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(_CylinderPainter old) =>
      old.offset != offset || old.face != face || old.pulse != pulse || old.side != side;
}

/// Barre del volume del microfono dentro il pulsante.
class _Bars extends StatelessWidget {
  const _Bars({required this.level, required this.color, required this.size});
  final double level;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    const shape = [0.45, 0.75, 1.0, 0.75, 0.45];
    return SizedBox(
      width: size * 1.2,
      height: size,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          for (final k in shape)
            AnimatedContainer(
              duration: const Duration(milliseconds: 80),
              width: size * 0.13,
              height: size * (0.15 + 0.85 * (level * k).clamp(0.0, 1.0)),
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(size)),
            ),
        ],
      ),
    );
  }
}
