import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'languages.dart';
import 'screens/dialog_screen.dart';
import 'screens/languages_screen.dart';
import 'screens/scanner_screen.dart';
import 'services/prefs.dart';
import 'services/translator_service.dart';
import 'ui/manga.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await Prefs.init();
  runApp(const MangaVoxApp());
}

class MangaVoxApp extends StatelessWidget {
  const MangaVoxApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Manga Vox',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: MC.yellow, primary: MC.black, secondary: MC.red),
          scaffoldBackgroundColor: MC.paper,
          useMaterial3: true,
        ),
        home: const HomeScreen(),
      );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _firstRun());
  }

  /// Al primo avvio propone di scaricare le lingue per l'uso offline.
  Future<void> _firstRun() async {
    if (Prefs.flag('onboarded')) return;
    final missing = await TranslatorService.instance.missing(Lang.values);
    await Prefs.setFlag('onboarded', true);
    if (missing.isEmpty || !mounted) return;
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const LanguagesScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MC.black,
      // Le schermate vengono ricreate al cambio tab: così la fotocamera
      // è accesa solo quando serve.
      body: _tab == 0 ? const DialogScreen() : const ScannerScreen(),
      bottomNavigationBar: Container(
        color: MC.black,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
            child: Row(children: [
              Expanded(child: _tabBtn(0, 'DIALOGO', Icons.record_voice_over)),
              const SizedBox(width: 10),
              Expanded(child: _tabBtn(1, 'SCANNER', Icons.document_scanner)),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _tabBtn(int i, String label, IconData icon) {
    final sel = _tab == i;
    return GestureDetector(
      onTap: () => setState(() => _tab = i),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: sel ? MC.yellow : const Color(0xFF2A2A2A),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: sel ? MC.white : const Color(0xFF444444), width: 3),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: sel ? MC.black : MC.white, size: 26),
          const SizedBox(width: 8),
          Text(label, style: comic(24, color: sel ? MC.black : MC.white)),
        ]),
      ),
    );
  }
}
