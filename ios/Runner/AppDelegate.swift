import Flutter
import SwiftUI
import Translation
import UIKit
import Vision

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "CyrillicOcrPlugin") {
      CyrillicOcrPlugin.register(with: registrar)
    }
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "NativeHelpersPlugin") {
      NativeHelpersPlugin.register(with: registrar)
    }
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "AppleTranslatePlugin") {
      AppleTranslatePlugin.register(with: registrar)
    }
  }
}

/// Lettura del testo cirillico (russo) dalle foto, offline, con Apple Vision.
/// ML Kit non supporta il cirillico, quindi il russo passa da qui.
class CyrillicOcrPlugin: NSObject, FlutterPlugin {
  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "manga_vox/cyrillic_ocr", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(CyrillicOcrPlugin(), channel: channel)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard call.method == "recognize" else {
      result(FlutterMethodNotImplemented)
      return
    }
    guard let args = call.arguments as? [String: Any],
          let path = args["path"] as? String,
          let image = UIImage(contentsOfFile: path),
          let cgImage = image.cgImage else {
      result(FlutterError(code: "args", message: "Immagine non leggibile", details: nil))
      return
    }
    guard #available(iOS 16.0, *) else {
      result(FlutterError(code: "ios", message: "La lettura del russo richiede iOS 16 o successivo", details: nil))
      return
    }

    let request = VNRecognizeTextRequest { req, error in
      if let error = error {
        DispatchQueue.main.async { result(FlutterError(code: "ocr", message: error.localizedDescription, details: nil)) }
        return
      }
      let lines = (req.results as? [VNRecognizedTextObservation] ?? [])
        .compactMap { obs -> (String, CGRect)? in
          guard let s = obs.topCandidates(1).first?.string else { return nil }
          return (s, obs.boundingBox)
        }
      // Raggruppa le righe in paragrafi: uno spazio verticale ampio separa i blocchi.
      var text = ""
      var prev: CGRect?
      for (s, box) in lines {
        if let p = prev {
          let gap = p.minY - box.maxY
          text += gap > p.height * 0.9 ? "\n\n" : "\n"
        }
        text += s
        prev = box
      }
      DispatchQueue.main.async { result(text) }
    }
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ru-RU"]
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(
      cgImage: cgImage,
      orientation: CGImagePropertyOrientation(image.imageOrientation),
      options: [:]
    )
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        DispatchQueue.main.async { result(FlutterError(code: "ocr", message: error.localizedDescription, details: nil)) }
      }
    }
  }
}

extension CGImagePropertyOrientation {
  init(_ o: UIImage.Orientation) {
    switch o {
    case .up: self = .up
    case .down: self = .down
    case .left: self = .left
    case .right: self = .right
    case .upMirrored: self = .upMirrored
    case .downMirrored: self = .downMirrored
    case .leftMirrored: self = .leftMirrored
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}

/// Percorso su disco di un asset Flutter (per leggere il modello vocale
/// incluso nell'app senza copiarlo).
class NativeHelpersPlugin: NSObject, FlutterPlugin {
  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "manga_vox/native", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(NativeHelpersPlugin(), channel: channel)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard call.method == "assetPath",
          let args = call.arguments as? [String: Any],
          let asset = args["asset"] as? String else {
      result(FlutterMethodNotImplemented)
      return
    }
    let key = FlutterDartProject.lookupKey(forAsset: asset)
    result(Bundle.main.path(forResource: key, ofType: nil))
  }
}

/// Traduzione offline con il traduttore di Apple (lo stesso dell'app Traduci).
/// - status: "installed" / "supported" / "unsupported" / "unavailable"
/// - translate: richiede iOS 26 e lingue già scaricate
/// - prepare: mostra la richiesta di sistema per scaricare le lingue
class AppleTranslatePlugin: NSObject, FlutterPlugin {
  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "manga_vox/apple_translate", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(AppleTranslatePlugin(), channel: channel)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let args = call.arguments as? [String: Any] ?? [:]
    switch call.method {
    case "status":
      guard #available(iOS 26.0, *) else { result("unavailable"); return }
      guard let from = args["from"] as? String, let to = args["to"] as? String else {
        result(FlutterError(code: "args", message: "from/to mancanti", details: nil)); return
      }
      Task {
        let status = await LanguageAvailability().status(
          from: Locale.Language(identifier: from), to: Locale.Language(identifier: to))
        let value: String
        switch status {
        case .installed: value = "installed"
        case .supported: value = "supported"
        case .unsupported: value = "unsupported"
        @unknown default: value = "unsupported"
        }
        await MainActor.run { result(value) }
      }

    case "translate":
      guard #available(iOS 26.0, *) else { result(FlutterError(code: "ios", message: "Serve iOS 26", details: nil)); return }
      guard let text = args["text"] as? String, let from = args["from"] as? String, let to = args["to"] as? String else {
        result(FlutterError(code: "args", message: "text/from/to mancanti", details: nil)); return
      }
      Task {
        do {
          let session = try TranslationSession(
            installedSource: Locale.Language(identifier: from), target: Locale.Language(identifier: to))
          let response = try await session.translate(text)
          let out = response.targetText
          await MainActor.run { result(out) }
        } catch {
          let msg = error.localizedDescription
          await MainActor.run { result(FlutterError(code: "translate", message: msg, details: nil)) }
        }
      }

    case "prepare":
      guard #available(iOS 18.0, *) else { result(false); return }
      let raw = args["pairs"] as? [[String]] ?? []
      let configs = raw.compactMap { p -> TranslationSession.Configuration? in
        guard p.count == 2 else { return nil }
        return TranslationSession.Configuration(
          source: Locale.Language(identifier: p[0]), target: Locale.Language(identifier: p[1]))
      }
      guard !configs.isEmpty, let root = AppleTranslatePlugin.topController() else { result(false); return }
      var host: UIViewController?
      let view = PrepareTranslationView(configs: configs) {
        host?.dismiss(animated: true) { result(true) }
      }
      let controller = UIHostingController(rootView: view)
      controller.modalPresentationStyle = .overFullScreen
      controller.view.backgroundColor = .clear
      host = controller
      root.present(controller, animated: false)

    default:
      result(FlutterMethodNotImplemented)
    }
  }

  static func topController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap { $0.windows }.first { $0.isKeyWindow } ?? scenes.first?.windows.first
    var top = window?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}

/// Vista invisibile che chiede al sistema di scaricare le lingue Apple,
/// una coppia alla volta (iOS mostra la sua finestra di conferma).
@available(iOS 18.0, *)
struct PrepareTranslationView: View {
  let configs: [TranslationSession.Configuration]
  let onDone: () -> Void
  @State private var index = 0

  var body: some View {
    Color.black.opacity(0.25)
      .ignoresSafeArea()
      .translationTask(index < configs.count ? configs[index] : nil) { session in
        do {
          try await session.prepareTranslation()
        } catch {
          // Lingua rifiutata o non disponibile: si passa alla successiva.
        }
        await MainActor.run {
          if index + 1 < configs.count {
            index += 1
          } else {
            onDone()
          }
        }
      }
  }
}
