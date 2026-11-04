import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manga_vox/languages.dart';
import 'package:manga_vox/screens/home_screen.dart';
import 'package:manga_vox/screens/language_screen.dart';
import 'package:manga_vox/screens/setup_screen.dart';
import 'package:manga_vox/services/direction.dart';
import 'package:manga_vox/services/lang_detect.dart';
import 'package:manga_vox/services/ocr_service.dart';
import 'package:manga_vox/services/prefs.dart';
import 'package:manga_vox/services/speech_service.dart';
import 'package:manga_vox/ui/manga.dart';
import 'package:manga_vox/ui/push_button.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakePaths extends PathProviderPlatform with MockPlatformInterfaceMixin {
  _FakePaths(this.dir);
  final String dir;
  @override
  Future<String?> getApplicationSupportPath() async => dir;
  @override
  Future<String?> getLibraryPath() async => dir;
  @override
  Future<String?> getTemporaryPath() async => dir;
}

Future<void> _loadFont(String family, List<String> paths) async {
  final loader = FontLoader(family);
  for (final p in paths) {
    loader.addFont(Future.value(ByteData.sublistView(File(p).readAsBytesSync())));
  }
  await loader.load();
}

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

/// Salva uno screenshot in docs/screenshots (solo se SCREENSHOTS=1).
Future<void> _shot(WidgetTester tester, Finder f, String name) async {
  if (Platform.environment['SCREENSHOTS'] != '1') return;
  await expectLater(f, matchesGoldenFile('../docs/screenshots/$name.png'));
}

void main() {
  late Directory tmp;
  late bool modelsDownloaded;

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({'mine': 'it', 'partner': 'en', 'mine_set': true});
    await Prefs.init();
    tmp = Directory.systemTemp.createTempSync('mv');
    PathProviderPlatform.instance = _FakePaths(tmp.path);
    await _loadFont('Bangers', ['assets/fonts/Bangers-Regular.ttf']);
    final mf = '${Platform.environment['FLUTTER_ROOT'] ?? '/opt/flutter'}/bin/cache/artifacts/material_fonts';
    if (Directory(mf).existsSync()) {
      await _loadFont('Roboto', ['$mf/Roboto-Regular.ttf', '$mf/Roboto-Bold.ttf', '$mf/Roboto-Black.ttf']);
      await _loadFont('MaterialIcons', ['$mf/MaterialIcons-Regular.otf']);
    }
  });

  setUp(() {
    modelsDownloaded = true;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('google_mlkit_on_device_translator'),
      (call) async => modelsDownloaded,
    );
  });

  group('direzione automatica', () {
    test('parlo nella mia lingua → traduce verso l\'interlocutore', () {
      final d = Direction(mine: Lang.it, partner: Lang.en);
      expect(d.route(Lang.it), (Lang.it, Lang.en));
    });
    test('sento il tedesco → l\'interlocutore diventa tedesco e traduco in italiano', () {
      final d = Direction(mine: Lang.it, partner: Lang.en);
      expect(d.route(Lang.de), (Lang.de, Lang.it));
      expect(d.partner, Lang.de);
      expect(d.route(Lang.it), (Lang.it, Lang.de));
    });
    test('account in inglese: l\'inglese è "mio", l\'italiano è dell\'interlocutore', () {
      final d = Direction(mine: Lang.en, partner: Lang.en);
      expect(d.route(Lang.en), (Lang.en, Lang.it));
      expect(d.route(Lang.ru), (Lang.ru, Lang.en));
    });
    test('scanner: targetFor non cambia l\'interlocutore', () {
      final d = Direction(mine: Lang.it, partner: Lang.fr);
      expect(d.targetFor(Lang.zh), Lang.it);
      expect(d.targetFor(Lang.it), Lang.fr);
      expect(d.partner, Lang.fr);
    });
  });

  test('alfabeto: russo e cinese riconosciuti con certezza', () {
    expect(LangDetect.scriptGuess('Где находится вокзал?'), Lang.ru);
    expect(LangDetect.scriptGuess('火车站在哪里？'), Lang.zh);
    expect(LangDetect.scriptGuess('Where is the station?'), isNull);
  });

  test('codici lingua', () {
    expect(Lang.fromCode('zh-Hans'), Lang.zh);
    expect(Lang.fromCode('en_US'), Lang.en);
    expect(Lang.fromCode('es'), isNull);
  });

  test('trascrizione ripulita dalle annotazioni di Whisper', () {
    expect(SpeechService.cleanTranscript(' [musica] Ciao,  come stai? (ride) '), 'Ciao, come stai?');
  });

  test('OCR: divisione in paragrafi', () {
    expect(OcrService.splitParagraphs('Привет\nмир\n\n  Как дела? \n'), ['Привет мир', 'Как дела?']);
  });

  testWidgets('home: un solo pulsante 3D, pronto all\'uso', (tester) async {
    _phone(tester);
    File('${tmp.path}/ggml-base-q5_1.bin').writeAsBytesSync(List.filled(1100000, 0));
    await tester.pumpWidget(const MaterialApp(debugShowCheckedModeBanner: false, home: HomeScreen()));
    await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 200)));
    await tester.pump();
    expect(find.byType(PushButton3D), findsOneWidget);
    expect(find.text('TIENI\nPREMUTO'), findsOneWidget);
    expect(find.text('LA MIA LINGUA  '), findsOneWidget);
    expect(find.text('AUTO'), findsNothing);
    await _shot(tester, find.byType(HomeScreen), 'home');
  });

  testWidgets('pulsante 3D: registrazione e conversazione', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: HalftoneBackground(
            speedLines: true,
            focus: const Alignment(0, 0.55),
            child: SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 14),
                      child: SpeechBubble(
                        color: MC.yellow,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Dov\'è la stazione?', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                            Text('Where is the station?', style: TextStyle(fontSize: 14, fontStyle: FontStyle.italic)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const Spacer(),
                  PushButton3D(state: PushState.recording, onPress: () {}, onRelease: () {}),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('TI\nASCOLTO!'), findsOneWidget);
    await _shot(tester, find.byType(Scaffold), 'recording');
  });

  testWidgets('primo avvio: scelta della mia lingua, italiano preselezionato', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      const MaterialApp(debugShowCheckedModeBanner: false, home: LanguageScreen(initial: Lang.it)),
    );
    expect(find.text('CHE LINGUA PARLI?'), findsOneWidget);
    await tester.tap(find.text('Deutsch'));
    await tester.pump();
    expect(find.text('WELCHE SPRACHE SPRICHST DU?'), findsOneWidget);
    await tester.tap(find.text('Italiano'));
    await tester.pump();
    await _shot(tester, find.byType(LanguageScreen), 'language');
  });

  testWidgets('preparazione offline: un pulsante scarica tutto', (tester) async {
    _phone(tester);
    modelsDownloaded = false;
    File('${tmp.path}/ggml-base-q5_1.bin').deleteSync();
    await tester.pumpWidget(const MaterialApp(debugShowCheckedModeBanner: false, home: SetupScreen()));
    await tester.runAsync(() => Future.delayed(const Duration(milliseconds: 200)));
    await tester.pump();
    expect(find.text('SCARICA TUTTO'), findsOneWidget);
    await _shot(tester, find.byType(SetupScreen), 'setup');
  });
}
