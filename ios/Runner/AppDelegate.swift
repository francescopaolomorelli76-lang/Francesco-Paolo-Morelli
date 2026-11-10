import AVFoundation
import Flutter
import Speech
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
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "LiveSpeechPlugin") {
      LiveSpeechPlugin.register(with: registrar)
    }
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "AudioRoutePlugin") {
      AudioRoutePlugin.register(with: registrar)
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

/// Riconoscimento vocale in tempo reale con il motore di Apple (sul telefono).
/// Mentre il pulsante è premuto: microfono → parole parziali + livello del
/// volume (eventi), e copia dell'audio su file (per riconoscere la lingua).
class LiveSpeechPlugin: NSObject, FlutterPlugin, FlutterStreamHandler {
  private var sink: FlutterEventSink?
  private let engine = AVAudioEngine()
  private var recognizer: SFSpeechRecognizer?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  // Tenuti in memoria finché il riconoscimento di un file non finisce.
  private var fileRecognizer: SFSpeechRecognizer?
  private var fileTask: SFSpeechRecognitionTask?
  private var file: AVAudioFile?
  private var lastText = ""
  private var peakDb: Float = -160
  private var waiter: ((String) -> Void)?
  private var running = false

  static func register(with registrar: FlutterPluginRegistrar) {
    let instance = LiveSpeechPlugin()
    let channel = FlutterMethodChannel(name: "manga_vox/speech", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(instance, channel: channel)
    let events = FlutterEventChannel(name: "manga_vox/speech_events", binaryMessenger: registrar.messenger())
    events.setStreamHandler(instance)
  }

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    sink = events
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    sink = nil
    return nil
  }

  private func emit(_ event: [String: Any]) {
    DispatchQueue.main.async { self.sink?(event) }
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let args = call.arguments as? [String: Any] ?? [:]
    switch call.method {
    case "permissions":
      result(permissionMap())
    case "request":
      AVAudioSession.sharedInstance().requestRecordPermission { _ in
        SFSpeechRecognizer.requestAuthorization { _ in
          DispatchQueue.main.async { result(self.permissionMap()) }
        }
      }
    case "openSettings":
      if let url = URL(string: UIApplication.openSettingsURLString) {
        UIApplication.shared.open(url)
      }
      result(nil)
    case "supports":
      let id = args["locale"] as? String ?? "en-US"
      let rec = SFSpeechRecognizer(locale: Locale(identifier: id))
      result(["available": rec?.isAvailable ?? false, "onDevice": rec?.supportsOnDeviceRecognition ?? false])
    case "start":
      do {
        try start(locale: args["locale"] as? String, path: args["path"] as? String,
                  headsetMic: (args["input"] as? String) == "headset")
        result(true)
      } catch {
        cancel()
        result(FlutterError(code: "start", message: error.localizedDescription, details: nil))
      }
    case "stop":
      stop { text in result(["text": text, "peakDb": Double(self.peakDb)]) }
    case "cancel":
      cancel()
      result(nil)
    case "recognizeFile":
      guard let path = args["path"] as? String, let id = args["locale"] as? String,
            let rec = SFSpeechRecognizer(locale: Locale(identifier: id)) else {
        result(nil)
        return
      }
      let req = SFSpeechURLRecognitionRequest(url: URL(fileURLWithPath: path))
      req.shouldReportPartialResults = false
      if rec.supportsOnDeviceRecognition { req.requiresOnDeviceRecognition = true }
      if #available(iOS 16.0, *) { req.addsPunctuation = true }
      var answered = false
      fileTask?.cancel()
      fileRecognizer = rec
      fileTask = rec.recognitionTask(with: req) { [weak self] res, err in
        DispatchQueue.main.async {
          if answered { return }
          if let res = res, res.isFinal {
            answered = true
            result(res.bestTranscription.formattedString)
            self?.fileTask = nil
          } else if err != nil {
            answered = true
            result(nil)
            self?.fileTask = nil
          }
        }
      }
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func permissionMap() -> [String: String] {
    let mic: String
    switch AVAudioSession.sharedInstance().recordPermission {
    case .granted: mic = "granted"
    case .denied: mic = "denied"
    default: mic = "undetermined"
    }
    let speech: String
    switch SFSpeechRecognizer.authorizationStatus() {
    case .authorized: speech = "granted"
    case .denied, .restricted: speech = "denied"
    default: speech = "undetermined"
    }
    return ["mic": mic, "speech": speech]
  }

  private func start(locale: String?, path: String?, headsetMic: Bool) throws {
    cancel()
    let session = AVAudioSession.sharedInstance()
    // Microfono: per chi indossa le cuffie (pulsante IO) quello delle cuffie/AirPods,
    // per l'interlocutore (pulsante LUI/LEI) quello del telefono.
    let options: AVAudioSession.CategoryOptions = headsetMic
      ? [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
      : [.defaultToSpeaker, .allowBluetoothA2DP]
    try session.setCategory(.playAndRecord, mode: .default, options: options)
    try session.setActive(true, options: .notifyOthersOnDeactivation)
    AudioRoutePlugin.preferInput(headset: headsetMic)
    lastText = ""
    peakDb = -160

    let input = engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else {
      throw NSError(domain: "MangaVox", code: 1, userInfo: [NSLocalizedDescriptionKey: "Microfono non disponibile"])
    }
    if let path = path {
      // WAV 16 bit: lo legge sia il riconoscimento della lingua sia Apple.
      let wav: [String: Any] = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: format.sampleRate,
        AVNumberOfChannelsKey: format.channelCount,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
      ]
      file = try AVAudioFile(
        forWriting: URL(fileURLWithPath: path), settings: wav,
        commonFormat: format.commonFormat, interleaved: format.isInterleaved)
    }
    if let id = locale, let rec = SFSpeechRecognizer(locale: Locale(identifier: id)) {
      recognizer = rec
      let req = SFSpeechAudioBufferRecognitionRequest()
      req.shouldReportPartialResults = true
      if rec.supportsOnDeviceRecognition { req.requiresOnDeviceRecognition = true }
      if #available(iOS 16.0, *) { req.addsPunctuation = true }
      request = req
      task = rec.recognitionTask(with: req) { [weak self] res, err in
        guard let self = self else { return }
        if let res = res {
          let text = res.bestTranscription.formattedString
          DispatchQueue.main.async { self.lastText = text }
          self.emit(["type": "partial", "text": text])
          if res.isFinal { self.finish() }
        }
        if err != nil { self.finish() }
      }
    }

    input.removeTap(onBus: 0)
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      guard let self = self else { return }
      self.request?.append(buffer)
      try? self.file?.write(from: buffer)
      guard let data = buffer.floatChannelData?[0] else { return }
      let n = Int(buffer.frameLength)
      if n == 0 { return }
      var sum: Float = 0
      for i in 0..<n { sum += data[i] * data[i] }
      let db = 20 * log10(max(sqrt(sum / Float(n)), 0.0000001))
      if db > self.peakDb { self.peakDb = db }
      self.emit(["type": "level", "db": Double(db)])
    }
    engine.prepare()
    try engine.start()
    running = true
  }

  private func stop(_ done: @escaping (String) -> Void) {
    if running {
      running = false
      engine.stop()
      engine.inputNode.removeTap(onBus: 0)
    }
    file = nil
    guard let req = request else {
      done(lastText)
      return
    }
    waiter = done
    req.endAudio()
    // Il risultato finale sul telefono arriva in pochi decimi di secondo;
    // per sicurezza non si aspetta mai più di 1,2 secondi.
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in self?.finish() }
  }

  private func finish() {
    DispatchQueue.main.async {
      guard let done = self.waiter else { return }
      self.waiter = nil
      self.task?.cancel()
      self.task = nil
      self.request = nil
      self.recognizer = nil
      done(self.lastText)
    }
  }

  private func cancel() {
    if running {
      running = false
      engine.stop()
      engine.inputNode.removeTap(onBus: 0)
    }
    task?.cancel()
    task = nil
    request = nil
    recognizer = nil
    file = nil
    if let done = waiter {
      waiter = nil
      done(lastText)
    }
  }
}

/// Dove va l'audio quando sono collegate cuffie o AirPods.
/// - "speaker": altoparlante del telefono (la traduzione per l'interlocutore)
/// - "headphones": cuffie se collegate, altrimenti altoparlante (la traduzione per me)
class AudioRoutePlugin: NSObject, FlutterPlugin {
  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "manga_vox/audio_route", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(AudioRoutePlugin(), channel: channel)
  }

  private static let headsetPorts: [AVAudioSession.Port] = [
    .headphones, .bluetoothA2DP, .bluetoothHFP, .bluetoothLE, .usbAudio, .headsetMic,
  ]

  /// true se sono collegate cuffie (con filo o Bluetooth).
  static func headphonesConnected() -> Bool {
    let s = AVAudioSession.sharedInstance()
    if s.currentRoute.outputs.contains(where: { headsetPorts.contains($0.portType) }) { return true }
    if s.currentRoute.inputs.contains(where: { headsetPorts.contains($0.portType) }) { return true }
    return (s.availableInputs ?? []).contains(where: { [.bluetoothHFP, .headsetMic, .usbAudio].contains($0.portType) })
  }

  static func headphonesName() -> String {
    let s = AVAudioSession.sharedInstance()
    let all = s.currentRoute.outputs + (s.availableInputs ?? [])
    return all.first(where: { headsetPorts.contains($0.portType) })?.portName ?? ""
  }

  /// Sceglie il microfono: quello delle cuffie oppure quello del telefono.
  static func preferInput(headset: Bool) {
    let s = AVAudioSession.sharedInstance()
    guard let inputs = s.availableInputs else { return }
    if headset {
      if let mic = inputs.first(where: { [.bluetoothHFP, .headsetMic, .usbAudio].contains($0.portType) }) {
        try? s.setPreferredInput(mic)
      }
    } else if let mic = inputs.first(where: { $0.portType == .builtInMic }) {
      try? s.setPreferredInput(mic)
    }
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let s = AVAudioSession.sharedInstance()
    switch call.method {
    case "status":
      result(["headphones": AudioRoutePlugin.headphonesConnected(), "name": AudioRoutePlugin.headphonesName()])
    case "toSpeaker":
      do {
        try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try s.setActive(true)
        try s.overrideOutputAudioPort(.speaker)
        result(true)
      } catch {
        result(false)
      }
    case "toHeadphones":
      do {
        try? s.overrideOutputAudioPort(.none)
        try s.setCategory(.playback, mode: .default, options: [.duckOthers])
        try s.setActive(true)
        result(true)
      } catch {
        result(false)
      }
    default:
      result(FlutterMethodNotImplemented)
    }
  }
}
