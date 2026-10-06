package com.arya.fuelmiles

import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var chooser: ValueCallback<Array<Uri>>? = null
    private var ins = intArrayOf(0, 0, 0, 0) // top, bottom, left, right (dp)

    private val picker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        chooser?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(it.resultCode, it.data))
        chooser = null
    }

    // Kirim inset native ke CSS (--ins-top/--ins-bot/...). CSS memakai max(env(), var()) jadi tidak dobel.
    private fun pushInsets() {
        val js = "var s=document.documentElement.style;" +
            "s.setProperty('--ins-top','${ins[0]}px');s.setProperty('--ins-bot','${ins[1]}px');" +
            "s.setProperty('--ins-left','${ins[2]}px');s.setProperty('--ins-right','${ins[3]}px');"
        web.evaluateJavascript(js, null)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false) // edge-to-edge eksplisit: perilaku sama di semua API
        web = WebView(this).also { setContentView(it) }
        val dark = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        WindowCompat.getInsetsController(window, web).apply {
            isAppearanceLightStatusBars = !dark; isAppearanceLightNavigationBars = !dark
        }
        ViewCompat.setOnApplyWindowInsetsListener(web) { _, i ->
            val b = i.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val d = resources.displayMetrics.density
            ins = intArrayOf((b.top / d).toInt(), (b.bottom / d).toInt(), (b.left / d).toInt(), (b.right / d).toInt())
            pushInsets(); i
        }
        // PENTING: tetap file:///android_asset agar origin (dan localStorage lama) tidak berubah
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(v: WebView, url: String) = pushInsets()
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(w: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                chooser?.onReceiveValue(null); chooser = cb
                picker.launch(p.createIntent()); return true
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })
        web.loadUrl("file:///android_asset/index.html")
    }
}
