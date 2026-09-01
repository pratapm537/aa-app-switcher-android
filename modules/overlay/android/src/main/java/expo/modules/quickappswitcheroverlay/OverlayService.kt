package expo.modules.quickappswitcheroverlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.Toast
import androidx.core.app.NotificationCompat
import android.graphics.drawable.GradientDrawable
import android.app.usage.UsageStatsManager
import android.app.usage.UsageEvents
import android.content.pm.PackageManager
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.util.Log
import kotlin.math.abs

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null

    private val updateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "expo.modules.quickappswitcheroverlay.UPDATE_ICON_SIZE") {
                val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
                val iconSizePref = prefs.getString("overlay_icon_size", "small") ?: "small"
                Log.d("QuickAppSwitcherOverlay", "UPDATE_ICON_SIZE received: $iconSizePref")
                updateIconSize(iconSizePref)
            } else if (intent?.action == "expo.modules.quickappswitcheroverlay.UPDATE_OPACITY") {
                val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
                val opacityPref = prefs.getFloat("overlay_opacity", 0.85f)
                Log.d("QuickAppSwitcherOverlay", "UPDATE_OPACITY received: $opacityPref")
                updateOpacity(opacityPref)
            } else if (intent?.action == "expo.modules.quickappswitcheroverlay.UPDATE_SPACING") {
                val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
                val spacingPref = prefs.getInt("overlay_icon_spacing", 8)
                Log.d("QuickAppSwitcherOverlay", "UPDATE_SPACING received: $spacingPref")
                updateSpacing(spacingPref)
            } else if (intent?.action == "expo.modules.quickappswitcheroverlay.UPDATE_SELECTED_APPS") {
                Log.d("QuickAppSwitcherOverlay", "UPDATE_SELECTED_APPS received")
                rebuildIcons()
            } else if (intent?.action == "expo.modules.quickappswitcheroverlay.UPDATE_SWITCHER_STYLE") {
                Log.d("QuickAppSwitcherOverlay", "UPDATE_SWITCHER_STYLE received")
                rebuildIcons()
            } else if (intent?.action == "expo.modules.quickappswitcheroverlay.UPDATE_DOCK_COLOR") {
                Log.d("QuickAppSwitcherOverlay", "UPDATE_DOCK_COLOR received")
                rebuildIcons()
            }
        }
    }

    private fun updateOpacity(opacityPref: Float) {
        val layout = overlayView as? LinearLayout ?: return
        Log.d("QuickAppSwitcherOverlay", "Applying opacity: $opacityPref")
        layout.alpha = opacityPref
        try {
            if (layout.isAttachedToWindow) {
                windowManager.updateViewLayout(layout, layout.layoutParams)
            }
        } catch (e: Exception) {
            Log.e("QuickAppSwitcherOverlay", "Error updating opacity", e)
        }
    }

    private fun updateSpacing(spacingPref: Int) {
        Log.d("QuickAppSwitcherOverlay", "Applying spacing: $spacingPref")
        rebuildIcons()
    }

    private fun updateIconSize(iconSizePref: String) {
        Log.d("QuickAppSwitcherOverlay", "Applying icon size: $iconSizePref")
        rebuildIcons()
    }

    private lateinit var usageStatsManager: UsageStatsManager
    private var isMonitoring = false
    private val handler = Handler(Looper.getMainLooper())
    private var lastEventTime = System.currentTimeMillis() - 10000
    private var currentForegroundApp: String? = null
    
    private var targetApps = listOf<String>()
    
    private fun loadTargetApps(): List<String> {
        val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
        val apps = mutableListOf<String>()
        for (i in 1..5) {
            val defaultPkg = when (i) {
                1 -> "com.whatsapp"
                2 -> "com.instagram.android"
                3 -> "com.google.android.youtube"
                else -> ""
            }
            val pkg = prefs.getString("selected_app_$i", defaultPkg) ?: ""
            if (pkg.isNotEmpty()) {
                apps.add(pkg)
            }
        }
        return apps
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        
        val filter = IntentFilter("expo.modules.quickappswitcheroverlay.UPDATE_ICON_SIZE")
        filter.addAction("expo.modules.quickappswitcheroverlay.UPDATE_OPACITY")
        filter.addAction("expo.modules.quickappswitcheroverlay.UPDATE_SPACING")
        filter.addAction("expo.modules.quickappswitcheroverlay.UPDATE_SELECTED_APPS")
        filter.addAction("expo.modules.quickappswitcheroverlay.UPDATE_SWITCHER_STYLE")
        filter.addAction("expo.modules.quickappswitcheroverlay.UPDATE_DOCK_COLOR")
        targetApps = loadTargetApps()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(updateReceiver, filter)
        }

        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        createNotificationChannel()
        startForeground(1, createNotification())
        showOverlay()
        startMonitoring()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "overlay_channel",
                "App Switcher Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): android.app.Notification {
        return NotificationCompat.Builder(this, "overlay_channel")
            .setContentTitle("Quick App Switcher")
            .setContentText("Intelligent overlay is active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startMonitoring() {
        Log.d("QuickAppSwitcherOverlay", "Service started")
        initializeForegroundApp()
        isMonitoring = true
        handler.post(monitorRunnable)
    }

    private fun initializeForegroundApp() {
        val time = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(time - 1000 * 60 * 60, time)
        val event = UsageEvents.Event()
        var maxEventTime = time - 10000 // default fallback
        
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                currentForegroundApp = event.packageName
                if (event.timeStamp > maxEventTime) {
                    maxEventTime = event.timeStamp
                }
            }
        }
        lastEventTime = maxEventTime
        Log.d("QuickAppSwitcherOverlay", "Initial foreground package detected: $currentForegroundApp")
    }

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring) return
            try {
                checkForegroundApp()
            } catch (e: Exception) {
                Log.e("QuickAppSwitcherOverlay", "Error checking foreground app", e)
            }
            handler.postDelayed(this, 1000) // Poll every 1000ms
        }
    }

    private var lastLoggedForegroundApp: String? = null
    private var lastLoggedVisibility: Boolean? = null

    private fun checkForegroundApp() {
        val time = System.currentTimeMillis()
        // Query last 10 seconds to catch delayed events, without growing indefinitely
        val queryStart = time - 10000 
        val events = usageStatsManager.queryEvents(queryStart, time)
        val event = UsageEvents.Event()
        
        var hasNewEvent = false
        var maxEventTime = lastEventTime

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            // Process only events newer than what we've already processed
            if (event.timeStamp > lastEventTime) {
                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    currentForegroundApp = event.packageName
                    hasNewEvent = true
                }
                if (event.timeStamp > maxEventTime) {
                    maxEventTime = event.timeStamp
                }
            }
        }
        
        if (maxEventTime > lastEventTime) {
            lastEventTime = maxEventTime
        }

        val foregroundApp = currentForegroundApp ?: return
        val launcherApp = getDefaultLauncherPackage()

        val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
        val homeBehavior = prefs.getString("home_screen_behavior", "hide") ?: "hide"

        val shouldShow = when {
            homeBehavior == "show" -> true
            foregroundApp in targetApps -> true
            foregroundApp == packageName -> true // Keep visible in our own Quick App Switcher app
            else -> false
        }

        if (foregroundApp != lastLoggedForegroundApp) {
            Log.d("QuickAppSwitcherOverlay", "Foreground app changed: $foregroundApp")
            lastLoggedForegroundApp = foregroundApp
        }

        if (shouldShow != lastLoggedVisibility || hasNewEvent) {
            Log.d("QuickAppSwitcherOverlay", "Foreground package: $foregroundApp")
            Log.d("QuickAppSwitcherOverlay", "Launcher package: $launcherApp")
            Log.d("QuickAppSwitcherOverlay", "Home behavior: $homeBehavior")
            Log.d("QuickAppSwitcherOverlay", "Should show overlay: $shouldShow")
            lastLoggedVisibility = shouldShow
        }

        if (shouldShow) {
            overlayView?.visibility = View.VISIBLE
        } else {
            overlayView?.visibility = View.GONE
        }
    }

    private fun getDefaultLauncherPackage(): String? {
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_HOME)
        val resolveInfo = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return resolveInfo?.activityInfo?.packageName
    }

    private fun showOverlay() {
        if (overlayView != null) {
            return
        }
        
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.TOP or Gravity.START
        
        val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
        val savedX = prefs.getInt("overlay_position_x", 100)
        val savedY = prefs.getInt("overlay_position_y", 200)
        
        val displayMetrics = resources.displayMetrics
        
        params.x = savedX
        params.y = savedY

        val context = this
        val layout = object : LinearLayout(context) {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var isDragging = false

            private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

            override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isDragging = false
                        return false 
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = (event.rawX - initialTouchX).toInt()
                        val dy = (event.rawY - initialTouchY).toInt()
                        if (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop) {
                            isDragging = true
                            return true 
                        }
                    }
                    MotionEvent.ACTION_CANCEL, MotionEvent.ACTION_UP -> {
                        isDragging = false
                    }
                }
                return false
            }

            override fun onTouchEvent(event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isDragging = false
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = (event.rawX - initialTouchX).toInt()
                        val dy = (event.rawY - initialTouchY).toInt()
                        if (!isDragging && (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop)) {
                            isDragging = true
                        }
                        if (isDragging) {

                            val proposedX = initialX + dx
                            val proposedY = initialY + dy
                            val currentMetrics = resources.displayMetrics
                            val currentScreenWidth = currentMetrics.widthPixels
                            val currentScreenHeight = currentMetrics.heightPixels
                            
                            val maxX = Math.max(0, currentScreenWidth - this.width)
                            val maxY = Math.max(0, currentScreenHeight - this.height)
                            
                            params.x = proposedX.coerceIn(0, maxX)
                            params.y = proposedY.coerceIn(0, maxY)
                            windowManager.updateViewLayout(this, params)
                        }
                        return true
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        if (isDragging) {
                            isDragging = false
                            params.x = initialX
                            params.y = initialY
                            windowManager.updateViewLayout(this, params)
                        }
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (isDragging) {
                            isDragging = false
                            
                            val prefs = context.getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
                            val switcherStyle = prefs.getString("switcher_style", "with_dock") ?: "with_dock"
                            
                            if (switcherStyle == "with_dock") {
                                // Magnetic snapping
                                val currentMetrics = resources.displayMetrics
                                val screenWidth = currentMetrics.widthPixels
                                val screenHeight = currentMetrics.heightPixels
                                
                                val edgeMargin = (16 * currentMetrics.density).toInt()
                                val maxX = Math.max(0, screenWidth - this.width)
                                val maxY = Math.max(0, screenHeight - this.height)
                                
                                val centerX = params.x + this.width / 2
                                val centerY = params.y + this.height / 2
                                
                                val distLeft = centerX
                                val distRight = screenWidth - centerX
                                val distTop = centerY
                                val distBottom = screenHeight - centerY
                                
                                val minDist = minOf(distLeft, distRight, distTop, distBottom)
                                
                                var newEdge = "left"
                                when (minDist) {
                                    distLeft -> { params.x = edgeMargin; newEdge = "left" }
                                    distRight -> { params.x = maxX - edgeMargin; newEdge = "right" }
                                    distTop -> { params.y = edgeMargin; newEdge = "top" }
                                    distBottom -> { params.y = maxY - edgeMargin; newEdge = "bottom" }
                                }
                                
                                val editor = prefs.edit()
                                editor.putString("overlay_edge", newEdge)
                                editor.putInt("overlay_position_x", params.x)
                                editor.putInt("overlay_position_y", params.y)
                                editor.apply()
                                
                                windowManager.updateViewLayout(this, params)
                                
                                // Send broadcast or call rebuild to update orientation based on new edge
                                rebuildIcons()
                            } else {
                                val editor = context.getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE).edit()
                                editor.putInt("overlay_position_x", params.x)
                                editor.putInt("overlay_position_y", params.y)
                                editor.apply()
                            }
                        } else {
                            // It was a tap (not dragging) on the background
                            val prefs = context.getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
                            val switcherStyle = prefs.getString("switcher_style", "with_dock") ?: "with_dock"
                            if (switcherStyle == "with_dock") {
                                val currentExpanded = prefs.getBoolean("overlay_expanded", false)
                                if (!currentExpanded) {
                                    prefs.edit().putBoolean("overlay_expanded", true).apply()
                                    rebuildIcons()
                                }
                            }
                        }
                        return true
                    }
                }
                return super.onTouchEvent(event)
            }
        }
        
        overlayView = layout
        rebuildIcons()

        layout.viewTreeObserver.addOnGlobalLayoutListener(object : android.view.ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                if (layout.width > 0 && layout.height > 0) {
                    val currentMetrics = resources.displayMetrics
                    val currentScreenWidth = currentMetrics.widthPixels
                    val currentScreenHeight = currentMetrics.heightPixels
                    
                    val maxX = Math.max(0, currentScreenWidth - layout.width)
                    val maxY = Math.max(0, currentScreenHeight - layout.height)
                    var changed = false

                    if (params.x > maxX || params.x < 0) {
                        params.x = params.x.coerceIn(0, maxX)
                        changed = true
                    }
                    if (params.y > maxY || params.y < 0) {
                        params.y = params.y.coerceIn(0, maxY)
                        changed = true
                    }
                    if (changed) {
                        try {
                            if (overlayView?.isAttachedToWindow == true) {
                                windowManager.updateViewLayout(layout, params)
                                val editor = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE).edit()
                                editor.putInt("overlay_position_x", params.x)
                                editor.putInt("overlay_position_y", params.y)
                                editor.apply()
                            }
                        } catch (e: Exception) {}
                    }
                }
            }
        })

        windowManager.addView(overlayView, params)
    }

    private fun createButton(colorHex: String, packageName: String, index: Int, containerDp: Int, iconDp: Int, spacingPx: Int, switcherStyle: String, isVertical: Boolean, isFirst: Boolean): View {
        val container = android.widget.FrameLayout(this)
        
        if (switcherStyle == "with_dock") {
            // Keep icons transparent within the pill dock
        } else {
            val shape = GradientDrawable()
            shape.shape = GradientDrawable.OVAL
            shape.setColor(Color.parseColor(colorHex))
            shape.alpha = 64
            container.background = shape
        }
        
        val density = resources.displayMetrics.density
        val size = (containerDp * density).toInt() 
        val hMargin = if (switcherStyle == "with_dock") (2 * density).toInt() else (6 * density).toInt()
        
        val containerParams = LinearLayout.LayoutParams(size, size)
        if (isVertical) {
            val topMargin = if (isFirst) 0 else spacingPx
            containerParams.setMargins(hMargin, topMargin, hMargin, 0)
        } else {
            val leftMargin = if (isFirst) 0 else spacingPx
            containerParams.setMargins(leftMargin, hMargin, 0, hMargin)
        }
        container.layoutParams = containerParams

        val imageView = android.widget.ImageView(this)
        imageView.scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
        try {
            val icon = packageManager.getApplicationIcon(packageName)
            imageView.setImageDrawable(icon)
        } catch (e: Exception) {
            // If not installed, just subtle background
        }
        
        val iconSize = (iconDp * density).toInt()
        val iconParams = android.widget.FrameLayout.LayoutParams(iconSize, iconSize)
        iconParams.gravity = Gravity.CENTER
        imageView.layoutParams = iconParams
        
        container.addView(imageView)

        container.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> { v.alpha = 0.6f }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> { v.alpha = 1.0f }
            }
            false
        }

        container.setOnClickListener {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
            } else {
                Toast.makeText(this, "App not installed: $packageName", Toast.LENGTH_SHORT).show()
            }
        }
        return container
    }

    private fun createHandleButton(containerDp: Int, density: Float): View {
        val container = android.widget.FrameLayout(this)
        val size = (containerDp * density).toInt() 
        val hMargin = (2 * density).toInt()
        
        val containerParams = LinearLayout.LayoutParams(size, size)
        containerParams.setMargins(hMargin, hMargin, hMargin, hMargin)
        container.layoutParams = containerParams

        val textView = android.widget.TextView(this)
        textView.text = "⋮"
        textView.textSize = 24f
        textView.setTextColor(Color.WHITE)
        textView.gravity = Gravity.CENTER
        
        val textParams = android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT, 
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT
        )
        textView.layoutParams = textParams
        
        container.addView(textView)

        container.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> { v.alpha = 0.6f }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> { v.alpha = 1.0f }
            }
            false
        }

        container.setOnClickListener {
            val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("overlay_expanded", true).apply()
            rebuildIcons()
        }
        return container
    }

    private fun createCollapseArrow(dockEdge: String, containerDp: Int, density: Float, spacingPx: Int, isFirst: Boolean): View {
        val container = android.widget.FrameLayout(this)
        val size = (containerDp * density).toInt() 
        val hMargin = (2 * density).toInt()
        
        val containerParams = LinearLayout.LayoutParams(size, size)
        val isVertical = dockEdge == "left" || dockEdge == "right"
        if (isVertical) {
            val topMargin = if (isFirst) 0 else spacingPx
            containerParams.setMargins(hMargin, topMargin, hMargin, 0)
        } else {
            val leftMargin = if (isFirst) 0 else spacingPx
            containerParams.setMargins(leftMargin, hMargin, 0, hMargin)
        }
        container.layoutParams = containerParams

        val textView = android.widget.TextView(this)
        textView.text = when (dockEdge) {
            "left" -> "◀"
            "right" -> "▶"
            "top" -> "▲"
            else -> "▼"
        }
        textView.textSize = 20f
        textView.setTextColor(Color.WHITE)
        textView.gravity = Gravity.CENTER
        
        val textParams = android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT, 
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT
        )
        textView.layoutParams = textParams
        
        container.addView(textView)

        container.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> { v.alpha = 0.6f }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> { v.alpha = 1.0f }
            }
            false
        }

        container.setOnClickListener {
            val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("overlay_expanded", false).apply()
            rebuildIcons()
        }
        return container
    }

    private fun rebuildIcons() {
        val layout = overlayView as? LinearLayout ?: return
        layout.removeAllViews()
        
        targetApps = loadTargetApps()
        val prefs = getSharedPreferences("QuickAppSwitcherPrefs", Context.MODE_PRIVATE)
        val iconSizePref = prefs.getString("overlay_icon_size", "small") ?: "small"
        val containerDp = when (iconSizePref) {
            "small" -> 30
            "large" -> 44
            else -> 36
        }
        val iconDp = when (iconSizePref) {
            "small" -> 20
            "large" -> 30
            else -> 24
        }
        val spacingPref = prefs.getInt("overlay_icon_spacing", 8)
        val switcherStyle = prefs.getString("switcher_style", "with_dock") ?: "with_dock"
        val density = resources.displayMetrics.density
        val spacingPx = (spacingPref * density).toInt()
        val colors = listOf("#10B981", "#EC4899", "#EF4444", "#3B82F6", "#8B5CF6")

        val dockEdge = prefs.getString("overlay_edge", "left") ?: "left"
        val isExpanded = prefs.getBoolean("overlay_expanded", false)
        val isVertical = dockEdge == "left" || dockEdge == "right"
        val opacityPref = prefs.getFloat("overlay_opacity", 0.85f)

        if (switcherStyle == "with_dock") {
            layout.alpha = 1.0f
            val pillShape = GradientDrawable()
            pillShape.shape = GradientDrawable.RECTANGLE
            pillShape.cornerRadius = 100f * density
            val alphaInt = (opacityPref * 255).toInt() 
            
            val dockColorPref = prefs.getString("dock_background_color", "#1C1C1E") ?: "#1C1C1E"
            val parsedColor = try { Color.parseColor(dockColorPref) } catch (e: Exception) { Color.parseColor("#1C1C1E") }
            val r = Color.red(parsedColor)
            val g = Color.green(parsedColor)
            val b = Color.blue(parsedColor)
            pillShape.setColor(Color.argb(alphaInt, r, g, b))
            layout.background = pillShape
            
            val p = (8 * density).toInt()
            layout.setPadding(p, p, p, p)
            layout.orientation = if (isVertical) LinearLayout.VERTICAL else LinearLayout.HORIZONTAL
            
            if (isExpanded) {
                if (isVertical) {
                    layout.addView(createCollapseArrow(dockEdge, containerDp, density, spacingPx, true))
                }
                
                targetApps.forEachIndexed { index, packageName ->
                    val colorHex = colors[index % colors.size]
                    val isFirst = if (isVertical) false else index == 0
                    layout.addView(createButton(colorHex, packageName, index, containerDp, iconDp, spacingPx, switcherStyle, isVertical, isFirst))
                }
                
                if (!isVertical) {
                    layout.addView(createCollapseArrow(dockEdge, containerDp, density, spacingPx, false))
                }
            } else {
                layout.addView(createHandleButton(containerDp, density))
            }
        } else {
            layout.alpha = opacityPref
            layout.background = null
            layout.setPadding(0, 0, 0, 0)
            layout.orientation = LinearLayout.VERTICAL
            
            targetApps.forEachIndexed { index, packageName ->
                val colorHex = colors[index % colors.size]
                layout.addView(createButton(colorHex, packageName, index, containerDp, iconDp, spacingPx, switcherStyle, true, index == 0))
            }
        }
        
        layout.requestLayout()
        try {
            if (layout.isAttachedToWindow) {
                windowManager.updateViewLayout(layout, layout.layoutParams)
            }
        } catch (e: Exception) {
            Log.e("QuickAppSwitcherOverlay", "Error updating WindowManager during rebuild", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isMonitoring = false
        handler.removeCallbacksAndMessages(null)
        try {
            unregisterReceiver(updateReceiver)
        } catch (e: Exception) {
            Log.e("QuickAppSwitcherOverlay", "Error unregistering receiver", e)
        }
        

        try {
            overlayView?.let {
                if (it.isAttachedToWindow) {
                    windowManager.removeView(it)
                }
            }
        } catch (e: Exception) {
            Log.e("QuickAppSwitcherOverlay", "Error removing overlay view", e)
        }
        overlayView = null
    }
}
