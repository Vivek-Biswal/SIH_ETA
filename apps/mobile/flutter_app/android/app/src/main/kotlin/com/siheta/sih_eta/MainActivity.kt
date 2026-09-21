package com.siheta.sih_eta

import android.content.Intent
import android.provider.AlarmClock
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "sih_eta/travel").setMethodCallHandler { call, result ->
            try {
                when (call.method) {
                    "share" -> {
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, call.argument<String>("text"))
                        }
                        startActivity(Intent.createChooser(intent, "Share journey"))
                        result.success(true)
                    }
                    "alarm" -> {
                        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                            putExtra(AlarmClock.EXTRA_HOUR, call.argument<Int>("hour"))
                            putExtra(AlarmClock.EXTRA_MINUTES, call.argument<Int>("minute"))
                            putExtra(AlarmClock.EXTRA_MESSAGE, call.argument<String>("label"))
                            putExtra(AlarmClock.EXTRA_SKIP_UI, false)
                        }
                        startActivity(intent)
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            } catch (e: Exception) {
                result.error("UNAVAILABLE", "No compatible application is available on this device.", null)
            }
        }
    }
}
