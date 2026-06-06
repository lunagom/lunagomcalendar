package app.lunagom.calendar

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView

/**
 * 위젯 투명도 설정 액티비티. 5단계 (0/25/50/75/100%).
 * 호출 경로:
 *  1) 위젯 추가 시 OS 가 자동 호출 (configure 메타 등록 시)
 *  2) 위젯 헤더의 ⚙️ 버튼 탭 시 (이미 추가된 위젯도 진입 가능)
 *
 * EXTRA_APPWIDGET_ID 가 없으면 그냥 닫힘.
 * 적용 시 prefs("widget_opacity_{id}") 에 값 저장 + 해당 Provider 에 update broadcast.
 */
class WidgetConfigActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        setContentView(R.layout.widget_config)

        appWidgetId = intent.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish(); return
        }

        val prefs = getSharedPreferences(WidgetCachePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val current = prefs.getInt("widget_opacity_$appWidgetId", 100)
        val initialStep = (current / 25).coerceIn(0, 4)

        val valueLabel = findViewById<TextView>(R.id.widget_config_value)
        val seek = findViewById<SeekBar>(R.id.widget_config_seekbar)
        val applyBtn = findViewById<Button>(R.id.widget_config_apply)

        seek.progress = initialStep
        valueLabel.text = "${initialStep * 25}%"

        seek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(s: SeekBar?, progress: Int, fromUser: Boolean) {
                valueLabel.text = "${progress * 25}%"
            }
            override fun onStartTrackingTouch(s: SeekBar?) {}
            override fun onStopTrackingTouch(s: SeekBar?) {}
        })

        applyBtn.setOnClickListener {
            val opacity = seek.progress * 25
            prefs.edit().putInt("widget_opacity_$appWidgetId", opacity).apply()
            val mgr = AppWidgetManager.getInstance(this)
            for (cls in listOf(CalendarWidgetProvider::class.java)) {
                val ids = mgr.getAppWidgetIds(ComponentName(this, cls))
                if (ids.contains(appWidgetId)) {
                    val b = Intent(this, cls).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                    }
                    sendBroadcast(b)
                }
            }
            val result = Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            setResult(RESULT_OK, result)
            finish()
        }
    }
}
