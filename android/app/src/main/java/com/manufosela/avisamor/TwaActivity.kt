package com.manufosela.avisamor

import android.os.Bundle
import android.widget.TextView
import android.widget.ScrollView

class TwaActivity : android.app.Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage("com.android.chrome")
            if (launchIntent != null) {
                val twaIntent = android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    android.net.Uri.parse("https://avisablue.com")
                ).apply {
                    setPackage("com.android.chrome")
                    addCategory(android.content.Intent.CATEGORY_BROWSABLE)
                    putExtra("android.support.customtabs.extra.SESSION", null as android.os.Bundle?)
                    putExtra("android.support.customtabs.extra.TITLE_VISIBILITY", 0)
                }
                startActivity(twaIntent)
                finish()
            } else {
                val intent = android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    android.net.Uri.parse("https://avisablue.com")
                )
                startActivity(intent)
                finish()
            }
        } catch (e: Exception) {
            val tv = TextView(this).apply {
                text = "Error: ${e.message}\n\n${e.stackTraceToString()}"
                setPadding(32, 64, 32, 32)
                textSize = 12f
            }
            val sv = ScrollView(this).apply { addView(tv) }
            setContentView(sv)
        }
    }
}
