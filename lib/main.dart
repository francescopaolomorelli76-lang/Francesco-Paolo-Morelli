import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/home_screen.dart';
import 'services/prefs.dart';
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
