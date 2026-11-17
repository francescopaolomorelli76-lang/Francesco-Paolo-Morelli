import UIKit
import WebKit
import Vision

/// Mostra Mozart (la web-app nel pacchetto) a tutto schermo e offre all'app le funzioni native.
final class WebViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
    private var webView: WKWebView!
    private let scheme = AppSchemeHandler()
    private var pendingURLs: [URL] = []
    private var loaded = false
    private var uploads: [String: (name: String, data: Data)] = [:]

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(scheme, forURLScheme: AppSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "mozart")
        if #available(iOS 14.0, *) { config.defaultWebpagePreferences.allowsContentJavaScript = true }

        webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.minimumZoomScale = 1
        webView.scrollView.maximumZoomScale = 1
        webView.allowsLinkPreview = false
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: URL(string: "\(AppSchemeHandler.scheme)://localhost/index.html")!))
    }

    // MARK: file in arrivo (Apri con Mozart, AirDrop, File)
    func receive(_ urls: [URL]) {
        pendingURLs.append(contentsOf: urls)
        if loaded { deliverPending() }
    }

    private func deliverPending() {
        guard !pendingURLs.isEmpty else { return }
        var list: [[String: Any]] = []
        for url in pendingURLs {
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            if let served = scheme.addInbox(file: url) {
                list.append(["url": served, "name": url.lastPathComponent])
            }
        }
        pendingURLs.removeAll()
        guard let json = try? JSONSerialization.data(withJSONObject: list),
              let str = String(data: json, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.MozartNative && MozartNative.receive(\(str))")
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        deliverPending()
    }

    // Se il sistema chiude il processo web (memoria), si ricarica da solo invece di restare bianco.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    // MARK: microfono (accordatore, registrazioni): consentito senza chiedere di nuovo oltre al permesso di iOS
    @available(iOS 15.0, *)
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }

    // link esterni: Safari
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, let s = url.scheme, s == "http" || s == "https", navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(url)
            decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    // alert/confirm usati dalla pagina
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    // MARK: messaggi dalla pagina
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else {
            replyHandler(nil, "messaggio non valido"); return
        }
        switch cmd {
        case "fileBegin":
            let id = body["id"] as? String ?? ""
            uploads[id] = (name: (body["name"] as? String) ?? "Mozart", data: Data())
            replyHandler(true, nil)
        case "fileChunk":
            let id = body["id"] as? String ?? ""
            if let s = body["data"] as? String, let d = Data(base64Encoded: s), uploads[id] != nil {
                uploads[id]!.data.append(d)
                replyHandler(true, nil)
            } else { replyHandler(nil, "dati non validi") }
        case "fileShare":
            let id = body["id"] as? String ?? ""
            guard let up = uploads.removeValue(forKey: id) else { replyHandler(nil, "file mancante"); return }
            share(name: up.name, data: up.data) { ok in replyHandler(ok, nil) }
        case "ocr":
            guard let s = body["image"] as? String else { replyHandler(nil, "immagine mancante"); return }
            recognizeText(dataURL: s) { words, err in replyHandler(words, err) }
        case "keepAwake":
            UIApplication.shared.isIdleTimerDisabled = (body["on"] as? Bool) ?? true
            replyHandler(true, nil)
        default:
            replyHandler(nil, "comando sconosciuto")
        }
    }

    // Foglio di condivisione di iOS: AirDrop, WhatsApp, Messaggi, Mail, Salva in File
    private func share(name: String, data: Data, done: @escaping (Bool) -> Void) {
        let safe = name.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(safe)
        do { try data.write(to: url, options: .atomic) } catch { done(false); return }
        let vc = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let pop = vc.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = []
        }
        vc.completionWithItemsHandler = { _, completed, _, _ in done(completed) }
        present(vc, animated: true)
    }

    // Lettura del testo stampato (sillabe sotto il rigo) con Vision: parole con posizione orizzontale (0…1)
    private func recognizeText(dataURL: String, done: @escaping ([[String: Any]]?, String?) -> Void) {
        guard let comma = dataURL.firstIndex(of: ","),
              let data = Data(base64Encoded: String(dataURL[dataURL.index(after: comma)...])),
              let image = UIImage(data: data), let cg = image.cgImage else { done(nil, "immagine non valida"); return }
        let request = VNRecognizeTextRequest { req, err in
            if let err = err { DispatchQueue.main.async { done(nil, err.localizedDescription) }; return }
            var words: [[String: Any]] = []
            for obs in (req.results as? [VNRecognizedTextObservation]) ?? [] {
                guard let cand = obs.topCandidates(1).first else { continue }
                let text = cand.string
                // posizione di ogni parola nella riga
                var start = text.startIndex
                for part in text.split(separator: " ", omittingEmptySubsequences: true) {
                    guard let r = text.range(of: String(part), range: start..<text.endIndex) else { continue }
                    start = r.upperBound
                    if let box = try? cand.boundingBox(for: r) {
                        let b = box.boundingBox
                        words.append(["text": String(part), "x": Double(b.minX), "w": Double(b.width), "y": 1 - Double(b.maxY)])
                    }
                }
            }
            words.sort { ($0["x"] as? Double ?? 0) < ($1["x"] as? Double ?? 0) }
            DispatchQueue.main.async { done(words, nil) }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["it-IT", "de-DE", "fr-FR", "en-US", "es-ES"]
        DispatchQueue.global(qos: .userInitiated).async {
            do { try VNImageRequestHandler(cgImage: cg, options: [:]).perform([request]) }
            catch { DispatchQueue.main.async { done(nil, error.localizedDescription) } }
        }
    }
}
