package app.lunagom.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

class CalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.widget_calendar)
            renderMonth(context, views, id)
            attachOpenAppIntent(context, views)
            attachConfigIntent(context, views, id)
            mgr.updateAppWidget(id, views)
        }
    }

    private fun attachConfigIntent(context: Context, views: RemoteViews, widgetId: Int) {
        val configIntent = Intent(context, WidgetConfigActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        // requestCode 를 widgetId 로 두어야 위젯이 여러 개일 때 PendingIntent 가 안 섞임
        val pi = PendingIntent.getActivity(
            context, widgetId, configIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_calendar_config, pi)
    }

    private fun renderMonth(context: Context, views: RemoteViews, widgetId: Int) {
        val prefs = context.getSharedPreferences(WidgetCachePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val cacheJson = prefs.getString("widget_calendar", null)
        val now = Calendar.getInstance()
        val year = now.get(Calendar.YEAR)
        val month = now.get(Calendar.MONTH) + 1
        val todayDay = now.get(Calendar.DAY_OF_MONTH)
        views.setTextViewText(R.id.widget_calendar_title, "${year}년 ${month}월")

        val opacity = prefs.getInt("widget_opacity_$widgetId", 100)
        val alpha = (255 * opacity / 100).coerceIn(0, 255)
        views.setInt(R.id.widget_root, "setBackgroundColor", (alpha shl 24) or 0xFFFFFF.toInt())

        val first = Calendar.getInstance().apply { set(year, month - 1, 1) }
        val firstDow = first.get(Calendar.DAY_OF_WEEK) - 1 // 일=0..토=6
        val daysInMonth = first.getActualMaximum(Calendar.DAY_OF_MONTH)

        // 날짜별 이벤트 목록 (시간 순서대로 최대 3개)
        val eventsByDay = mutableMapOf<Int, MutableList<Pair<String, String>>>() // day -> list of (color, title)
        if (cacheJson != null) {
            try {
                val cache = JSONObject(cacheJson)
                val cachedYear = cache.optInt("year", year)
                val cachedMonth = cache.optInt("month", month)
                if (cachedYear == year && cachedMonth == month) {
                    val events = cache.optJSONArray("events")
                    if (events != null) {
                        for (i in 0 until events.length()) {
                            val ev = events.optJSONObject(i) ?: continue
                            val date = ev.optString("date")
                            val color = ev.optString("color", "#E5E7EB")
                            val title = ev.optString("title", "")
                            val day = date.substringAfterLast("-").toIntOrNull() ?: continue
                            if (day !in 1..daysInMonth) continue
                            val list = eventsByDay.getOrPut(day) { mutableListOf() }
                            if (list.size < 3) list.add(color to title)
                        }
                    }
                }
            } catch (_: Exception) {
            }
        }

        val pkg = context.packageName
        val res = context.resources
        val chipIdNames = listOf("chip1", "chip2", "chip3")

        for (row in 0..5) {
            for (col in 0..6) {
                val cellIndex = row * 7 + col
                val day = cellIndex - firstDow + 1
                val dayId = res.getIdentifier("widget_cell_day_${row}_${col}", "id", pkg)
                if (dayId == 0) continue

                if (day in 1..daysInMonth) {
                    views.setTextViewText(dayId, day.toString())
                    val textColor = when {
                        day == todayDay -> Color.parseColor("#7C3AED")
                        col == 0 -> Color.parseColor("#DC2626")
                        col == 6 -> Color.parseColor("#2563EB")
                        else -> Color.parseColor("#374151")
                    }
                    views.setTextColor(dayId, textColor)

                    val dayEvents = eventsByDay[day].orEmpty()
                    for ((slotIdx, chipName) in chipIdNames.withIndex()) {
                        val chipId = res.getIdentifier("widget_cell_${chipName}_${row}_${col}", "id", pkg)
                        if (chipId == 0) continue
                        if (slotIdx < dayEvents.size) {
                            val (chipColor, chipTitle) = dayEvents[slotIdx]
                            views.setViewVisibility(chipId, View.VISIBLE)
                            val bg = try {
                                Color.parseColor(chipColor)
                            } catch (_: Exception) {
                                Color.parseColor("#E5E7EB")
                            }
                            views.setInt(chipId, "setBackgroundColor", bg)
                            // 배경 명도에 따라 텍스트 색 자동: 어두우면 흰색, 밝으면 검은색
                            val textColor = if (isDarkColor(bg)) Color.WHITE else Color.parseColor("#111827")
                            views.setTextColor(chipId, textColor)
                            views.setTextViewText(chipId, chipTitle.ifEmpty { " " })
                        } else {
                            views.setViewVisibility(chipId, View.GONE)
                        }
                    }
                } else {
                    views.setTextViewText(dayId, "")
                    for (chipName in chipIdNames) {
                        val chipId = res.getIdentifier("widget_cell_${chipName}_${row}_${col}", "id", pkg)
                        if (chipId != 0) views.setViewVisibility(chipId, View.GONE)
                    }
                }
            }
        }
    }

    private fun isDarkColor(color: Int): Boolean {
        val r = Color.red(color)
        val g = Color.green(color)
        val b = Color.blue(color)
        val luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
        return luminance < 0.6
    }

    private fun attachOpenAppIntent(context: Context, views: RemoteViews) {
        val uri = Uri.parse("https://lunabear-calendar.vercel.app/")
        val openApp = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = uri
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            context, 100, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pi)
    }
}
