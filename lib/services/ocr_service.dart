import 'dart:io';

import 'package:flutter/services.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';

import '../languages.dart';
import 'lang_detect.dart';

/// Testo letto da un'immagine, con la lingua riconosciuta.
class OcrResult {
  OcrResult(this.lang, this.blocks);
  final Lang? lang;
  final List<String> blocks;
}

/// Riconoscimento testo da immagini, tutto offline, con lingua automatica.
/// - ML Kit (script cinese, che legge anche l'alfabeto latino): IT/EN/DE/FR/ZH,
///   anche dal vivo.
/// - Cirillico (russo): canale nativo, solo foto. Tesseract su Android con
///   dati inclusi nell'app, Apple Vision su iOS (iOS 16+).
class OcrService {
  OcrService._();
  static final OcrService instance = OcrService._();

  /// Il riconoscitore "cinese" legge sia ideogrammi sia alfabeto latino.
  final TextRecognizer recognizer = TextRecognizer(script: TextRecognitionScript.chinese);
  static const _cyrillic = MethodChannel('manga_vox/cyrillic_ocr');

  Future<String> _tessDataPath() async {
    final base = await getApplicationSupportDirectory();
    final file = File('${base.path}/tessdata/rus.traineddata');
    if (!await file.exists()) {
      await file.parent.create(recursive: true);
      final data = await rootBundle.load('assets/tessdata/rus.traineddata');
      await file.writeAsBytes(data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes), flush: true);
    }
    return base.path;
  }

  Future<String> _readCyrillic(String path) async {
    try {
      return await _cyrillic.invokeMethod<String>('recognize', {
            'path': path,
            'dataPath': Platform.isAndroid ? await _tessDataPath() : '',
          }) ??
          '';
    } catch (_) {
      return '';
    }
  }

  /// Foto completa: prova ML Kit e il lettore cirillico, tiene il migliore.
  Future<OcrResult> readFile(String path) async {
    final results = await Future.wait([
      recognizer.processImage(InputImage.fromFilePath(path)).then(blocksOf),
      _readCyrillic(path).then(splitParagraphs),
    ]);
    final latin = results[0], cyr = results[1];
    final latinText = latin.join(' '), cyrText = cyr.join(' ');
    final cyrLetters = LangDetect.cyrillicLetters(cyrText);
    final isRussian =
        cyrLetters >= 6 &&
        cyrLetters >= 0.6 * LangDetect.allLetters(cyrText) &&
        cyrLetters > 0.8 * LangDetect.allLetters(latinText);
    if (isRussian) return OcrResult(Lang.ru, cyr);
    return OcrResult(await LangDetect.instance.detect(latinText), latin);
  }

  static List<String> blocksOf(RecognizedText result) =>
      result.blocks.map((b) => b.lines.map((l) => l.text).join(' ').trim()).where((t) => t.isNotEmpty).toList();

  static List<String> splitParagraphs(String text) => text
      .split(RegExp(r'\n\s*\n'))
      .map((p) => p.replaceAll(RegExp(r'\s+'), ' ').trim())
      .where((p) => p.isNotEmpty)
      .toList();
}
