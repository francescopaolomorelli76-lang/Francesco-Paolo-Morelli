# Mozart per Android / Google Play: blocco screenshot e "Scrivici"

Nel repository non esiste ancora un progetto Android di Mozart (la cartella `android/` è di Manga Vox).
Quando verrà creato l'involucro Android (WebView che carica `leggio/index.html`), servono queste due cose.
**Codice non compilato né provato qui: va verificato su un telefono/tablet Android.**

## 1. Blocco di screenshot e registrazione schermo (FLAG_SECURE)

In `MainActivity.kt`, prima di `setContentView`:

```kotlin
import android.view.WindowManager

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val secure = getSharedPreferences("mozart", MODE_PRIVATE).getBoolean("secure", true)
    if (secure) window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    // ...
}
```

Con FLAG_SECURE Android blocca screenshot, registrazione schermo e anteprima nelle app recenti (appare nero).

Interruttore dalle Impostazioni di Mozart (stesso ponte `MozartNative` usato su iPad): aggiungere alla WebView

```kotlin
webView.addJavascriptInterface(object {
    @android.webkit.JavascriptInterface fun setSecure(on: Boolean) = runOnUiThread {
        getSharedPreferences("mozart", MODE_PRIVATE).edit().putBoolean("secure", on).apply()
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE) else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
    @android.webkit.JavascriptInterface fun getSecure() = getSharedPreferences("mozart", MODE_PRIVATE).getBoolean("secure", true)
}, "AndroidMozart")
```

## 2. Scrivici (email)

```kotlin
@android.webkit.JavascriptInterface fun mail(to: String, subject: String, body: String) = runOnUiThread {
    val i = android.content.Intent(android.content.Intent.ACTION_SENDTO).apply {
        data = android.net.Uri.parse("mailto:")
        putExtra(android.content.Intent.EXTRA_EMAIL, arrayOf(to))
        putExtra(android.content.Intent.EXTRA_SUBJECT, subject)
        putExtra(android.content.Intent.EXTRA_TEXT, body)
    }
    startActivity(android.content.Intent.createChooser(i, "Scrivici"))
}
```

Senza queste funzioni, "Scrivici" usa comunque `mailto:` e il pulsante "Copia indirizzo".
