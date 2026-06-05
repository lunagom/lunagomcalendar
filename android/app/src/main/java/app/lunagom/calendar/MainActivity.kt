package app.lunagom.calendar

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WidgetCachePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
