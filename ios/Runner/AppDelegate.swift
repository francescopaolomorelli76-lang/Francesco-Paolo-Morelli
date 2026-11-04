import Flutter
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
