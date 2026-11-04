# Copia modificata di whisper_ggml 2.8.1 (licenza MIT, vedi LICENSE)

Unica modifica: su iOS e macOS il plugin rifiutava `language: "auto"` con
"error: unknown language", impedendo il riconoscimento automatico della lingua
(su Android era già accettato). Il controllo ora lascia passare "auto", che
whisper.cpp gestisce nativamente (`whisper_full` rileva la lingua).

File: `ios/Classes/whisper_flutter_plus.cpp`, `macos/Classes/whisper_ggml.cpp`.
