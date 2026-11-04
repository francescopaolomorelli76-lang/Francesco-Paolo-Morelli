import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_vox/languages.dart';
import 'package:manga_vox/screens/dialog_screen.dart';
import 'package:manga_vox/screens/languages_screen.dart';
import 'package:manga_vox/services/ocr_service.dart';
import 'package:manga_vox/services/prefs.dart';
import 'package:manga_vox/ui/manga.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> _loadFont(String family, List<String> paths) async {
  final loader = FontLoader(family);
  for (final p in paths) {
    loader.addFont(Future.value(ByteData.sublistView(File(p).readAsBytesSync())));
  }
  await loader.load();
}

Widget _app(Widget child) => MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(fontFamily: 'Roboto'),
      home: Scaffold(body: child),
    );

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Prefs.init();
    await _loadFont('Bangers', ['assets/fonts/Bangers-Regular.ttf']);
    final mf = '${Platform.environment['FLUTTER_ROOT'] ?? '/opt/flutter'}/bin/cache/artifacts/material_fonts';
    if (Directory(mf).existsSync()) {
      await _loadFont('Roboto', ['$mf/Roboto-Regular.ttf', '$mf/Roboto-Bold.ttf', '$mf/Roboto-Black.ttf']);
      await _loadFont('MaterialIcons', ['$mf/MaterialIcons-Regular.otf']);
    }
  });

  test('lingue: sei lingue, OCR russo nativo, cinese con ML Kit', () {
    expect(Lang.values.map((l) => l.name), ['it', 'en', 'de', 'fr', 'ru', 'zh']);
    expect(Lang.ru.usesNativeOcr, isTrue);
    expect(Lang.zh.usesNativeOcr, isFalse);
    expect(Lang.fromName('xx', Lang.it), Lang.it);
  });

  test('OCR: divisione in paragrafi', () {
    expect(OcrService.splitParagraphs('Привет\nмир\n\n  Как дела? \n'), ['Привет мир', 'Как дела?']);
  });

  testWidgets('schermata dialogo: due pulsanti PARLA', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_app(const DialogScreen()));
    expect(find.text('PARLA!'), findsNWidgets(2));
    expect(find.byType(LangPicker), findsNWidgets(2));
  });

  testWidgets('kit manga: nuvolette ed esplosione', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_app(HalftoneBackground(
      speedLines: true,
      child: ListView(padding: const EdgeInsets.all(20), children: const [
        OutlinedTitle('MANGA VOX!', size: 54),
        SizedBox(height: 20),
        SpeechBubble(child: Text('Ciao! Dove si trova la stazione?', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800))),
        SizedBox(height: 12),
        SpeechBubble(color: MC.yellow, tailLeft: false, child: Text('Hi! Where is the station?', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800))),
        SizedBox(height: 20),
        Center(child: BurstButton(label: 'SCATTA!', icon: Icons.camera_alt, onTap: null)),
      ]),
    )));
  });

  testWidgets('lingue offline: elenco con pulsante scarica', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    // Simula ML Kit: nessun modello ancora scaricato.
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('google_mlkit_on_device_translator'),
      (call) async => false,
    );
    await tester.pumpWidget(const MaterialApp(debugShowCheckedModeBanner: false, home: LanguagesScreen()));
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(find.text('SCARICA'), findsNWidgets(Lang.values.length));
  });
}
