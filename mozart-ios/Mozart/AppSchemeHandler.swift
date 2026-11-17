import Foundation
import WebKit
import UniformTypeIdentifiers

/// Serve la web-app dal pacchetto su mozart://localhost/… (origine sicura e stabile:
/// i dati della libreria restano salvati nell'app) e i file in arrivo su /__inbox/….
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "mozart"
    private let webRoot: URL = Bundle.main.resourceURL!.appendingPathComponent("Web")
    private let inbox: URL = {
        let u = FileManager.default.temporaryDirectory.appendingPathComponent("Inbox-Mozart", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()

    /// Copia un file ricevuto e restituisce l'indirizzo da cui la pagina può leggerlo.
    func addInbox(file: URL) -> String? {
        let name = UUID().uuidString + "-" + file.lastPathComponent
        let dest = inbox.appendingPathComponent(name)
        do {
            if FileManager.default.fileExists(atPath: dest.path) { try FileManager.default.removeItem(at: dest) }
            try FileManager.default.copyItem(at: file, to: dest)
        } catch { return nil }
        let enc = name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? name
        return "\(Self.scheme)://localhost/__inbox/\(enc)"
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { task.didFailWithError(URLError(.badURL)); return }
        var path = url.path.removingPercentEncoding ?? url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let fileURL: URL
        if path.hasPrefix("/__inbox/") {
            fileURL = inbox.appendingPathComponent(String(path.dropFirst("/__inbox/".count)))
        } else {
            fileURL = webRoot.appendingPathComponent(String(path.dropFirst()))
        }
        // niente uscite dalla cartella dell'app
        let std = fileURL.standardizedFileURL.path
        guard std.hasPrefix(webRoot.standardizedFileURL.path) || std.hasPrefix(inbox.standardizedFileURL.path),
              let data = try? Data(contentsOf: fileURL, options: .mappedIfSafe) else {
            let resp = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!
            task.didReceive(resp); task.didReceive(Data()); task.didFinish(); return
        }
        let mime = UTType(filenameExtension: fileURL.pathExtension)?.preferredMIMEType ?? Self.fallbackMime(fileURL.pathExtension)
        let headers = ["Content-Type": mime, "Content-Length": "\(data.count)", "Cache-Control": "no-cache",
                       "Access-Control-Allow-Origin": "*"]
        let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(resp)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func fallbackMime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html"
        case "js": return "text/javascript"
        case "css": return "text/css"
        case "wasm": return "application/wasm"
        case "woff2": return "font/woff2"
        case "json": return "application/json"
        default: return "application/octet-stream"
        }
    }
}
