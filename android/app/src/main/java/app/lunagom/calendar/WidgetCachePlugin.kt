package app.lunagom.calendar

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetCache")
class WidgetCachePlugin : Plugin() {

    companion object {
        const val PREFS_NAME = "lunabear_widget_cache"
    }

    @PluginMethod
    fun set(call: PluginCall) {
        val key = call.getString("key")
        val value = call.getString("value")
        if (key == null || value == null) {
            call.reject("key and value required")
            return
        }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(key, value).apply()
        call.resolve()
    }

    @PluginMethod
    fun get(call: PluginCall) {
        val key = call.getString("key")
        if (key == null) {
            call.reject("key required")
            return
        }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val value = prefs.getString(key, null)
        val result = JSObject()
        result.put("value", value)
        call.resolve(result)
    }

    @PluginMethod
    fun notifyWidgets(call: PluginCall) {
        val mgr = AppWidgetManager.getInstance(context)
        // ExpenseWidgetProvider 는 T13 에서 추가됨. 그 시점에 이 리스트에 함께 등록.
        for (cls in listOf(CalendarWidgetProvider::class.java)) {
            val ids = mgr.getAppWidgetIds(ComponentName(context, cls))
            if (ids.isNotEmpty()) {
                val intent = Intent(context, cls).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                }
                context.sendBroadcast(intent)
            }
        }
        call.resolve()
    }
}
