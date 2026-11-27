import UIKit

/// Contenitore che nasconde il suo contenuto a screenshot e registrazione schermo:
/// il contenuto vive dentro il livello di un campo di testo "sicuro" (come fanno le app bancarie).
/// Negli screenshot e nelle registrazioni la zona appare nera.
final class SecureHost: UIView {
    let content = UIView()
    private let field = UITextField()
    private var canvas: UIView?

    var secure: Bool = true { didSet { field.isSecureTextEntry = secure } }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .black
        field.isUserInteractionEnabled = false
        field.isSecureTextEntry = true
        field.translatesAutoresizingMaskIntoConstraints = false
        addSubview(field)
        NSLayoutConstraint.activate([
            field.topAnchor.constraint(equalTo: topAnchor), field.bottomAnchor.constraint(equalTo: bottomAnchor),
            field.leadingAnchor.constraint(equalTo: leadingAnchor), field.trailingAnchor.constraint(equalTo: trailingAnchor)])
        field.layoutIfNeeded()
        // il primo sottolivello del campo sicuro è quello che iOS esclude dalle catture
        let host = field.subviews.first ?? field
        host.isUserInteractionEnabled = true
        host.addSubview(content)
        content.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: host.topAnchor), content.bottomAnchor.constraint(equalTo: host.bottomAnchor),
            content.leadingAnchor.constraint(equalTo: host.leadingAnchor), content.trailingAnchor.constraint(equalTo: host.trailingAnchor)])
        canvas = host
    }
    required init?(coder: NSCoder) { fatalError() }
}
