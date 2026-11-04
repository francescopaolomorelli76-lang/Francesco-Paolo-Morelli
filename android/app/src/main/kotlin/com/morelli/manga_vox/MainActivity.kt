package com.morelli.manga_vox

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.os.Handler
import android.os.Looper
import com.googlecode.tesseract.android.TessBaseAPI
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.Executors

/**
 * Lettura del testo cirillico (russo) dalle foto, offline, con Tesseract.
 * ML Kit non supporta il cirillico, quindi il russo passa da qui.
 */
class MainActivity : FlutterActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "manga_vox/cyrillic_ocr")
            .setMethodCallHandler { call, result ->
                if (call.method != "recognize") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val path = call.argument<String>("path")
                val dataPath = call.argument<String>("dataPath")
                if (path == null || dataPath == null) {
                    result.error("args", "path/dataPath mancanti", null)
                    return@setMethodCallHandler
                }
                executor.execute {
                    try {
                        val text = recognize(path, dataPath)
                        main.post { result.success(text) }
                    } catch (e: Exception) {
                        main.post { result.error("ocr", e.message, null) }
                    }
                }
            }
    }

    private fun recognize(path: String, dataPath: String): String {
        val bmp = loadUpright(path) ?: throw IllegalArgumentException("Immagine non leggibile")
        val tess = TessBaseAPI()
        try {
            // dataPath deve contenere la cartella "tessdata" con rus.traineddata
            if (!tess.init(dataPath, "rus")) throw IllegalStateException("Dati OCR russi non trovati")
            tess.setPageSegMode(TessBaseAPI.PageSegMode.PSM_AUTO)
            tess.setImage(bmp)
            return tess.getUTF8Text() ?: ""
        } finally {
            tess.recycle()
            bmp.recycle()
        }
    }

    /** Carica la foto ridimensionata e raddrizzata secondo l'EXIF. */
    private fun loadUpright(path: String): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 2400) sample *= 2
        val bmp = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return null
        val degrees = when (
            ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        ) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }
        if (degrees == 0f) return bmp
        val rotated = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, Matrix().apply { postRotate(degrees) }, true)
        if (rotated !== bmp) bmp.recycle()
        return rotated
    }
}
