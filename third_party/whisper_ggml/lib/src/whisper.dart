import 'dart:convert';
import 'dart:ffi';
import 'dart:isolate';

import 'package:ffi/ffi.dart';
import 'package:flutter/foundation.dart';
import 'package:universal_io/io.dart';
import 'package:whisper_ggml/src/models/whisper_model.dart';
import 'package:whisper_ggml/src/whisper_audio_convert.dart';

import 'models/requests/release_model_request.dart';
import 'models/requests/transcribe_request.dart';
import 'models/requests/transcribe_request_dto.dart';
import 'models/requests/version_request.dart';
import 'models/responses/whisper_transcribe_response.dart';
import 'models/responses/whisper_version_response.dart';
import 'models/whisper_dto.dart';

export 'models/_models.dart';
export 'whisper_audio_convert.dart';

/// Native request type
typedef WReqNative = Pointer<Utf8> Function(Pointer<Utf8> body);

/// Entry point
class Whisper {
  /// [model] is required
  /// [modelDir] is path where downloaded model will be stored.
  /// Default to library directory
  const Whisper({required this.model, this.modelDir});

  /// model used for transcription
  final WhisperModel model;

  /// override of model storage path
  final String? modelDir;

  DynamicLibrary _openLib() {
    if (Platform.isAndroid) {
      return DynamicLibrary.open('libwhisper.so');
    } else if (Platform.isWindows) {
      return DynamicLibrary.open('whisper_ggml.dll');
    } else if (Platform.isLinux) {
      return DynamicLibrary.open('libwhisper_ggml.so');
    } else {
      return DynamicLibrary.process();
    }
  }

  Future<Map<String, dynamic>> _request({required WhisperRequestDto whisperRequest}) async {
    return Isolate.run(() async {
      final Pointer<Utf8> data = whisperRequest.toRequestString().toNativeUtf8();
      final Pointer<Utf8> res = _openLib().lookupFunction<WReqNative, WReqNative>('request').call(data);

      final Map<String, dynamic> result = json.decode(res.toDartString()) as Map<String, dynamic>;

      malloc.free(data);
      // Native responses are malloc'd specifically so this free is valid.
      malloc.free(res);
      return result;
    });
  }

  /// Transcribe audio file to text
  ///
  /// [onProgress] is invoked with whisper.cpp's transcription progress
  /// (0–100, coarse steps) while inference runs.
  Future<WhisperTranscribeResponse> transcribe({
    required TranscribeRequest transcribeRequest,
    required String modelPath,
    void Function(int percent)? onProgress,
  }) async {
    // A listener callable may be invoked from whisper's worker thread;
    // it delivers to this isolate. Kept open until the request finishes.
    final NativeCallable<Void Function(Int32)>? progressCallable =
        onProgress == null ? null : NativeCallable<Void Function(Int32)>.listener(onProgress);
    try {
      final File? convertedFile = await _whisperWav(transcribeRequest.audio);

      final TranscribeRequest req = transcribeRequest.copyWith(audio: convertedFile?.path ?? transcribeRequest.audio);

      final Map<String, dynamic> result = await _request(
        whisperRequest: TranscribeRequestDto.fromTranscribeRequest(
          req,
          modelPath,
          progressCallbackAddress: progressCallable?.nativeFunction.address,
        ),
      );

      if (result['text'] == null) {
        throw Exception(result['message']);
      }
      return WhisperTranscribeResponse.fromJson(result);
    } catch (e) {
      debugPrint(e.toString());
      rethrow;
    } finally {
      progressCallable?.close();
    }
  }

  /// Manga Vox: probability of each spoken language in [audio] (whisper
  /// language codes → 0..1), without transcribing. Much faster than a
  /// transcription with language "auto". Keeps the model loaded.
  Future<Map<String, double>> detectLanguage({
    required String audio,
    required String modelPath,
    int threads = 4,
  }) async {
    final File? wav = await _whisperWav(audio);
    final Map<String, dynamic> result = await _request(
      whisperRequest: _RawRequest(<String, dynamic>{
        '@type': 'detectLanguage',
        'model': modelPath,
        'audio': wav?.path ?? audio,
        'threads': threads,
      }),
    );
    if (result['@type'] != 'detectLanguage' || result['probs'] is! Map) {
      throw Exception(result['message'] ?? 'detectLanguage failed');
    }
    return (result['probs'] as Map).map((k, v) => MapEntry('$k', (v as num).toDouble()));
  }

  /// A 16 kHz 16-bit WAV of [audio]: the file itself when it already is one,
  /// otherwise a converted copy next to it (null if conversion failed).
  static Future<File?> _whisperWav(String audio) async {
    final File input = File(audio);
    if (await _isWhisperWav(input)) {
      return input;
    }
    return WhisperAudioConvert(audioInput: input, audioOutput: File('$audio.wav')).convert();
  }

  static Future<bool> _isWhisperWav(File f) async {
    try {
      final RandomAccessFile raf = await f.open();
      try {
        final List<int> h = await raf.read(4096);
        if (h.length < 36 ||
            String.fromCharCodes(h.sublist(0, 4)) != 'RIFF' ||
            String.fromCharCodes(h.sublist(8, 12)) != 'WAVE') {
          return false;
        }
        int pos = 12;
        while (pos + 8 <= h.length) {
          final String id = String.fromCharCodes(h.sublist(pos, pos + 4));
          final int size = h[pos + 4] | (h[pos + 5] << 8) | (h[pos + 6] << 16) | (h[pos + 7] << 24);
          if (id == 'fmt ' && pos + 24 <= h.length) {
            final int format = h[pos + 8] | (h[pos + 9] << 8);
            final int channels = h[pos + 10] | (h[pos + 11] << 8);
            final int rate = h[pos + 12] | (h[pos + 13] << 8) | (h[pos + 14] << 16) | (h[pos + 15] << 24);
            final int bits = h[pos + 22] | (h[pos + 23] << 8);
            return (format == 1 || format == 0xFFFE) && (channels == 1 || channels == 2) && rate == 16000 && bits == 16;
          }
          pos += 8 + size + (size & 1);
        }
        return false;
      } finally {
        await raf.close();
      }
    } catch (_) {
      return false;
    }
  }

  /// Free the model parked in native memory by a transcription with
  /// `keepModelLoaded: true`. Safe to call when nothing is parked.
  ///
  /// A transcription still in flight keeps its model until it completes;
  /// one that was started with `keepModelLoaded: true` parks the model
  /// again when it finishes.
  Future<void> releaseModel() async {
    final Map<String, dynamic> result = await _request(whisperRequest: const ReleaseModelRequest());
    if (result['@type'] == 'error') {
      throw Exception(result['message']);
    }
  }

  /// Get whisper version
  Future<String?> getVersion() async {
    final Map<String, dynamic> result = await _request(whisperRequest: const VersionRequest());

    final WhisperVersionResponse response = WhisperVersionResponse.fromJson(result);
    return response.message;
  }
}

class _RawRequest implements WhisperRequestDto {
  const _RawRequest(this.body);

  final Map<String, dynamic> body;

  @override
  String get specialType => '${body['@type']}';

  @override
  String toRequestString() => json.encode(body);
}
