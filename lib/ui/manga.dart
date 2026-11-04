import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../languages.dart';

/// MC = "Manga Colors". Kit grafico "manga / fumetto action": inchiostro nero, carta,
/// retini a puntini, linee cinetiche, esplosioni e nuvolette.
class MC {
  static const black = Color(0xFF111111);
  static const paper = Color(0xFFFFF8E7);
  static const yellow = Color(0xFFFFD60A);
  static const red = Color(0xFFE63946);
  static const cyan = Color(0xFF00B4D8);
  static const white = Colors.white;
}

const String kComicFont = 'Bangers';

TextStyle comic(double size, {Color color = MC.black, double spacing = 1.2}) =>
    TextStyle(fontFamily: kComicFont, fontSize: size, color: color, letterSpacing: spacing, height: 1.05);

/// Testo con contorno spesso, stile titolo di fumetto.
class OutlinedTitle extends StatelessWidget {
  const OutlinedTitle(this.text, {super.key, this.size = 34, this.fill = MC.yellow, this.stroke = 6});
  final String text;
  final double size;
  final Color fill;
  final double stroke;

  @override
  Widget build(BuildContext context) {
    final base = comic(size, spacing: 2);
    return Stack(children: [
      Transform.translate(
        offset: const Offset(3, 3),
        child: Text(text, style: base.copyWith(
          foreground: Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = stroke
            ..color = MC.black,
        )),
      ),
      Text(text, style: base.copyWith(
        foreground: Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..strokeJoin = StrokeJoin.round
          ..color = MC.black,
      )),
      Text(text, style: base.copyWith(color: fill)),
    ]);
  }
}

/// Sfondo con retino a puntini e (opzionale) linee cinetiche radiali.
class HalftoneBackground extends StatelessWidget {
  const HalftoneBackground({
    super.key,
    required this.child,
    this.color = MC.paper,
    this.dotColor = const Color(0x22000000),
    this.speedLines = false,
    this.focus = const Alignment(0, 0),
  });
  final Widget child;
  final Color color;
  final Color dotColor;
  final bool speedLines;
  final Alignment focus;

  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: _HalftonePainter(color, dotColor, speedLines, focus),
        child: child,
      );
}

class _HalftonePainter extends CustomPainter {
  _HalftonePainter(this.bg, this.dot, this.speed, this.focus);
  final Color bg, dot;
  final bool speed;
  final Alignment focus;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = bg);
    final center = focus.alongSize(size);
    if (speed) {
      final rnd = math.Random(7);
      final p = Paint()..color = const Color(0x18000000);
      final r = size.longestSide;
      for (var i = 0; i < 90; i++) {
        final a = i / 90 * math.pi * 2 + rnd.nextDouble() * 0.04;
        final w = 0.006 + rnd.nextDouble() * 0.012;
        final inner = r * (0.18 + rnd.nextDouble() * 0.12);
        final path = Path()
          ..moveTo(center.dx + math.cos(a) * inner, center.dy + math.sin(a) * inner)
          ..lineTo(center.dx + math.cos(a - w) * r, center.dy + math.sin(a - w) * r)
          ..lineTo(center.dx + math.cos(a + w) * r, center.dy + math.sin(a + w) * r)
          ..close();
        canvas.drawPath(path, p);
      }
    }
    // Retino: puntini che crescono allontanandosi dal centro.
    final p = Paint()..color = dot;
    const step = 14.0;
    final maxD = size.longestSide;
    for (double y = 0; y < size.height + step; y += step) {
      final odd = ((y / step).round()).isOdd;
      for (double x = odd ? step / 2 : 0; x < size.width + step; x += step) {
        final d = (Offset(x, y) - center).distance / maxD;
        final rad = 0.6 + d * 3.2;
        canvas.drawCircle(Offset(x, y), rad, p);
      }
    }
  }

  @override
  bool shouldRepaint(_HalftonePainter old) =>
      old.bg != bg || old.dot != dot || old.speed != speed || old.focus != focus;
}

/// Riquadro di fumetto: bordo spesso e ombra piena sfalsata.
class ComicPanel extends StatelessWidget {
  const ComicPanel({
    super.key,
    required this.child,
    this.color = MC.white,
    this.padding = const EdgeInsets.all(12),
    this.radius = 6,
    this.shadow = 5,
  });
  final Widget child;
  final Color color;
  final EdgeInsets padding;
  final double radius;
  final double shadow;

  @override
  Widget build(BuildContext context) => Container(
        padding: padding,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: MC.black, width: 3.5),
          boxShadow: [BoxShadow(color: MC.black, offset: Offset(shadow, shadow))],
        ),
        child: child,
      );
}

/// Nuvoletta con coda. [tailLeft] decide da che lato esce la coda.
class SpeechBubble extends StatelessWidget {
  const SpeechBubble({
    super.key,
    required this.child,
    this.color = MC.white,
    this.tailLeft = true,
    this.tailUp = false,
    this.shout = false,
  });
  final Widget child;
  final Color color;
  final bool tailLeft;
  final bool tailUp;
  final bool shout;

  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: _BubblePainter(color, tailLeft, tailUp),
        child: Padding(
          padding: EdgeInsets.fromLTRB(18, tailUp ? 30 : 14, 18, tailUp ? 14 : 30),
          child: child,
        ),
      );
}

class _BubblePainter extends CustomPainter {
  _BubblePainter(this.color, this.left, this.up);
  final Color color;
  final bool left, up;

  @override
  void paint(Canvas canvas, Size size) {
    const tail = 18.0;
    final body = up
        ? Rect.fromLTWH(0, tail, size.width, size.height - tail)
        : Rect.fromLTWH(0, 0, size.width, size.height - tail);
    final rr = RRect.fromRectAndRadius(body, const Radius.circular(26));
    final tx = left ? size.width * 0.22 : size.width * 0.78;
    final tailPath = up
        ? (Path()
          ..moveTo(tx - 14, body.top + 2)
          ..lineTo(tx + (left ? -16 : 16), 0)
          ..lineTo(tx + 12, body.top + 2)
          ..close())
        : (Path()
          ..moveTo(tx - 12, body.bottom - 2)
          ..lineTo(tx + (left ? -16 : 16), size.height)
          ..lineTo(tx + 14, body.bottom - 2)
          ..close());
    final shape = Path.combine(PathOperation.union, Path()..addRRect(rr), tailPath);
    canvas.drawPath(shape.shift(const Offset(4, 4)), Paint()..color = MC.black);
    canvas.drawPath(shape, Paint()..color = color);
    canvas.drawPath(
      shape,
      Paint()
        ..color = MC.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.5
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_BubblePainter old) => old.color != color || old.left != left || old.up != up;
}

/// Grosso pulsante a esplosione ("BOOM!"). Pulsa quando [active].
class BurstButton extends StatefulWidget {
  const BurstButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon = Icons.mic,
    this.size = 150,
    this.color = MC.yellow,
    this.activeColor = MC.red,
    this.active = false,
    this.busy = false,
  });
  final String label;
  final VoidCallback? onTap;
  final IconData icon;
  final double size;
  final Color color;
  final Color activeColor;
  final bool active;
  final bool busy;

  @override
  State<BurstButton> createState() => _BurstButtonState();
}

class _BurstButtonState extends State<BurstButton> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 700));

  @override
  void didUpdateWidget(BurstButton old) {
    super.didUpdateWidget(old);
    if (widget.active && !_c.isAnimating) {
      _c.repeat(reverse: true);
    } else if (!widget.active && _c.isAnimating) {
      _c.stop();
      _c.value = 0;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.active ? widget.activeColor : widget.color;
    final ink = widget.active ? MC.white : MC.black;
    return Semantics(
      button: true,
      label: widget.label,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, child) => Transform.scale(
            scale: 1 + _c.value * 0.08,
            child: Transform.rotate(angle: _c.value * 0.08, child: child),
          ),
          child: SizedBox.square(
            dimension: widget.size,
            child: CustomPaint(
              painter: _BurstPainter(color),
              child: Center(
                child: widget.busy
                    ? SizedBox.square(
                        dimension: widget.size * 0.28,
                        child: CircularProgressIndicator(strokeWidth: 5, color: ink),
                      )
                    : Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(widget.icon, size: widget.size * 0.3, color: ink),
                        Text(widget.label, style: comic(widget.size * 0.15, color: ink)),
                      ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

Path starburst(Size size, {int points = 14, double inner = 0.72, int seed = 3}) {
  final c = size.center(Offset.zero);
  final r = size.shortestSide / 2;
  final rnd = math.Random(seed);
  final path = Path();
  for (var i = 0; i < points * 2; i++) {
    final a = -math.pi / 2 + i * math.pi / points;
    final k = i.isEven ? 1.0 - rnd.nextDouble() * 0.1 : inner + rnd.nextDouble() * 0.06;
    final p = c + Offset(math.cos(a), math.sin(a)) * r * k;
    i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
  }
  return path..close();
}

class _BurstPainter extends CustomPainter {
  _BurstPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = Size(size.width - 8, size.height - 8);
    final path = starburst(s);
    canvas.drawPath(path.shift(const Offset(8, 8)), Paint()..color = MC.black);
    canvas.drawPath(path.shift(const Offset(2, 2)), Paint()..color = color);
    canvas.drawPath(
      path.shift(const Offset(2, 2)),
      Paint()
        ..color = MC.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeJoin = StrokeJoin.miter,
    );
  }

  @override
  bool shouldRepaint(_BurstPainter old) => old.color != color;
}

/// Pulsantino fumetto (rettangolo con ombra piena).
class ComicButton extends StatelessWidget {
  const ComicButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.color = MC.yellow,
    this.textColor = MC.black,
    this.size = 20,
  });
  final String label;
  final VoidCallback? onTap;
  final IconData? icon;
  final Color color;
  final Color textColor;
  final double size;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Opacity(
          opacity: onTap == null ? 0.5 : 1,
          child: ComicPanel(
            color: color,
            shadow: 4,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (icon != null) ...[Icon(icon, color: textColor, size: size + 2), const SizedBox(width: 6)],
              Text(label, style: comic(size, color: textColor)),
            ]),
          ),
        ),
      );
}

/// Selettore lingua: mostra bandiera + sigla, apre una griglia.
class LangPicker extends StatelessWidget {
  const LangPicker({super.key, required this.value, required this.onChanged, this.color = MC.white});
  final Lang value;
  final ValueChanged<Lang> onChanged;
  final Color color;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () async {
          final picked = await pickLanguage(context, value);
          if (picked != null) onChanged(picked);
        },
        child: ComicPanel(
          color: color,
          shadow: 4,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(value.flag, style: const TextStyle(fontSize: 24)),
            const SizedBox(width: 8),
            Text(value.short, style: comic(24)),
            const Icon(Icons.arrow_drop_down, color: MC.black),
          ]),
        ),
      );
}

Future<Lang?> pickLanguage(BuildContext context, Lang current) => showModalBottomSheet<Lang>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(12),
        child: ComicPanel(
          color: MC.paper,
          child: SafeArea(
            top: false,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const OutlinedTitle('SCEGLI LA LINGUA!', size: 28),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                crossAxisCount: 2,
                childAspectRatio: 2.6,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  for (final l in Lang.values)
                    GestureDetector(
                      onTap: () => Navigator.pop(ctx, l),
                      child: ComicPanel(
                        color: l == current ? MC.yellow : MC.white,
                        shadow: 3,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Row(children: [
                          Text(l.flag, style: const TextStyle(fontSize: 26)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(l.label,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                          ),
                        ]),
                      ),
                    ),
                ],
              ),
            ]),
          ),
        ),
      ),
    );

void comicToast(BuildContext context, String msg, {Color color = MC.yellow}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colors.transparent,
      elevation: 0,
      content: ComicPanel(
        color: color,
        child: Text(msg, style: const TextStyle(color: MC.black, fontWeight: FontWeight.w700, fontSize: 15)),
      ),
    ));
}
