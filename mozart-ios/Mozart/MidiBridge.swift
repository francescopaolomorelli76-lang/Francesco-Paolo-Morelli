import UIKit
import WebKit
import CoreMIDI
import CoreAudioKit

/// Tastiere MIDI (cavo o Bluetooth): le note arrivano alla pagina come window.MozartMIDI(status, nota, velocità).
final class MidiBridge {
    private var client = MIDIClientRef()
    private var port = MIDIPortRef()
    private weak var web: WKWebView?

    init(web: WKWebView) {
        self.web = web
        MIDIClientCreateWithBlock("Mozart" as CFString, &client) { [weak self] _ in
            DispatchQueue.main.async { self?.connectAll() }
        }
        MIDIInputPortCreateWithBlock(client, "Mozart in" as CFString, &port) { [weak self] list, _ in
            self?.handle(list)
        }
        connectAll()
    }

    var sourceCount: Int { MIDIGetNumberOfSources() }

    func connectAll() {
        for i in 0..<MIDIGetNumberOfSources() {
            MIDIPortConnectSource(port, MIDIGetSource(i), nil)
        }
    }

    private func handle(_ list: UnsafePointer<MIDIPacketList>) {
        var events: [(UInt8, UInt8, UInt8)] = []
        var packet = list.pointee.packet
        for _ in 0..<list.pointee.numPackets {
            let len = Int(packet.length)
            let bytes: [UInt8] = withUnsafeBytes(of: packet.data) { Array($0.prefix(len)) }
            var i = 0
            while i < bytes.count {
                let s = bytes[i]
                let kind = s & 0xF0
                if (kind == 0x90 || kind == 0x80 || kind == 0xB0) && i + 2 < bytes.count {
                    events.append((s, bytes[i + 1], bytes[i + 2]))
                    i += 3
                } else {
                    i += 1
                }
            }
            packet = MIDIPacketNext(&packet).pointee
        }
        guard !events.isEmpty else { return }
        DispatchQueue.main.async { [weak self] in
            let js = events.map { "MozartMIDI(\($0.0),\($0.1),\($0.2));" }.joined()
            self?.web?.evaluateJavaScript("if(window.MozartMIDI){\(js)}")
        }
    }

    /// Finestra di Apple per cercare e collegare le tastiere MIDI Bluetooth.
    func showBluetooth(from vc: UIViewController) {
        let bt = CABTMIDICentralViewController()
        let nav = UINavigationController(rootViewController: bt)
        bt.navigationItem.rightBarButtonItem = UIBarButtonItem(systemItem: .done, primaryAction: UIAction { [weak self] _ in
            nav.dismiss(animated: true)
            self?.connectAll()
        })
        nav.modalPresentationStyle = .formSheet
        vc.present(nav, animated: true)
    }
}
