import 'dart:io';

import 'package:flutter/services.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';

import '../languages.dart';

/// Riconoscimento testo da immagini, tutto offline.
/// - Latino (IT/EN/DE/FR) e cinese: ML Kit, veloce, anche dal vivo.
/// - Russo (cirillico): canale nativo (solo foto) — Tesseract su Android
///   con dati inclusi nell'app, Apple Vision su iOS (iOS 16+).
class OcrService {
  OcrService._();
  static final OcrService instance = OcrService._();

  final Map<TextRecognitionScript, TextRecognizer> _recognizers = {};
  static const _cyrillic = MethodChannel('manga_vox/cyrillic_ocr');

  /// Copia rus.traineddata dagli asset in una cartella leggibile da Tesseract.
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

  TextRecognizer recognizerFor(Lang lang) =>
      _recognizers[lang.ocrScript] ??= TextRecognizer(script: lang.ocrScript);

  /// Restituisce i blocchi di testo trovati nella foto.
  Future<List<String>> readFile(String path, Lang lang) async {
    if (lang.usesNativeOcr) {
      final text = await _cyrillic.invokeMethod<String>('recognize', {
        'path': path,
        'dataPath': Platform.isAndroid ? await _tessDataPath() : '',
      });
      return splitParagraphs(text ?? '');
    }
    final result = await recognizerFor(lang).processImage(InputImage.fromFilePath(path));
    return blocksOf(result);
  }

  static List<String> blocksOf(RecognizedText result) => result.blocks
      .map((b) => b.lines.map((l) => l.text).join(' ').trim())
      .where((t) => t.isNotEmpty)
      .toList();

  static List<String> splitParagraphs(String text) => text
      .split(RegExp(r'\n\s*\n'))
      .map((p) => p.replaceAll(RegExp(r'\s+'), ' ').trim())
      .where((p) => p.isNotEmpty)
      .toList();

  Future<void> dispose() async {
    for (final r in _recognizers.values) {
      await r.close();
    }
    _recognizers.clear();
  }
}
