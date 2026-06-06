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

/**
 * 5×6 캘린더 위젯. SharedPreferences (`lunabear_widget_cache`) 의 `widget_calendar` 키에서
 * { year, month, events: [{date, color}, ...], updatedAt } 캐시 JSON 을 읽어
 * 한 달 그리드(42 셀) 에 일자 + 색 점 + 오늘 강조를 그린다.
 */
class CalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.widget_calendar)
            renderMonth(context, views, id)
            attachOpenAppIntent(context, views)
            mgr.updateAppWidget(id, views)
        }
    }

    private fun renderMonth(context: Context, views: RemoteViews, widgetId: Int) {
        val prefs = context.getSharedPreferences(WidgetCachePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val cacheJson = prefs.getString("widget_calendar", null)
        val now = Calendar.getInstance()
        val year = now.get(Calendar.YEAR)
        val month = now.get(Calendar.MONTH) + 1
        val todayDay = now.get(Calendar.DAY_OF_MONTH)
        views.setTextViewText(R.id.widget_calendar_title, "${year}년 ${month}월")

        // 투명도 (0-100). 적용된 위젯별로 prefs 키 다름.
        val opacity = prefs.getInt("widget_opacity_$widgetId", 100)
        val alpha = (255 * opacity / 100).coerceIn(0, 255)
        views.setInt(R.id.widget_root, "setBackgroundColor", (alpha shl 24) or 0xFFFFFF.toInt())

        // 월 첫 날이 무슨 요일인지 (일요일=1, 토=7)
        val first = Calendar.getInstance().apply {
            set(year, month - 1, 1)
        }
        val firstDow = first.get(Calendar.DAY_OF_WEEK) - 1 // 일=0, 월=1, ... 토=6
        val daysInMonth = first.getActualMaximum(Calendar.DAY_OF_MONTH)

        // 캐시에서 날짜별 색 모음 (date "YYYY-MM-DD" → 첫 색)
        val eventsByDay = mutableMapOf<Int, String>()
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
                            val date = ev.optString("date") // "YYYY-MM-DD"
                            val color = ev.optString("color", "#6B7280")
                            val day = date.substringAfterLast("-").toIntOrNull() ?: continue
                            if (day !in 1..daysInMonth) continue
                            if (!eventsByDay.containsKey(day)) eventsByDay[day] = color
                        }
                    }
                }
            } catch (_: Exception) {
            }
        }

        // 42 셀 채우기
        val pkg = context.packageName
        val res = context.resources
        for (row in 0..5) {
            for (col in 0..6) {
                val cellIndex = row * 7 + col
                val day = cellIndex - firstDow + 1
                val dayId = res.getIdentifier("widget_cell_day_${row}_${col}", "id", pkg)
                val dotId = res.getIdentifier("widget_cell_dot_${row}_${col}", "id", pkg)
                if (dayId == 0 || dotId == 0) continue

                if (day in 1..daysInMonth) {
                    views.setTextViewText(dayId, day.toString())
                    val textColor = when {
                        day == todayDay -> Color.parseColor("#7C3AED") // primary — 오늘 강조
                        col == 0 -> Color.parseColor("#DC2626") // 일
                        col == 6 -> Color.parseColor("#2563EB") // 토
                        else -> Color.parseColor("#374151")
                    }
                    views.setTextColor(dayId, textColor)
                    val eventColor = eventsByDay[day]
                    if (eventColor != null) {
                        views.setViewVisibility(dotId, View.VISIBLE)
                        try {
                            views.setInt(dotId, "setBackgroundColor", Color.parseColor(eventColor))
                        } catch (_: Exception) {
                            views.setInt(dotId, "setBackgroundColor", Color.parseColor("#6B7280"))
                        }
                    } else {
                        views.setViewVisibility(dotId, View.INVISIBLE)
                    }
                } else {
                    views.setTextViewText(dayId, "")
                    views.setViewVisibility(dotId, View.INVISIBLE)
                }
            }
        }
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
