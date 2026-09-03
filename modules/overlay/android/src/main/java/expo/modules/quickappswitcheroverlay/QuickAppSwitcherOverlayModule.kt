package expo.modules.quickappswitcheroverlay

import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuickAppSwitcherOverlayModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuickAppSwitcherOverlay")

    Function("checkOverlayPermission") { ->
      val context = appContext.reactContext ?: return@Function false
      val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }
      return@Function result
    }

    Function("requestOverlayPermission") {
      val context = appContext.reactContext
      if (context != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
          val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            android.net.Uri.parse("package:" + context.packageName)
          )
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        } catch (e: Exception) {
          try {
            val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
            fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(fallbackIntent)
          } catch (e2: Exception) {
            // Ignore to prevent crash
          }
        }
      }
    }

    Function("startOverlay") {
      val context = appContext.reactContext
      if (context != null) {
        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          Settings.canDrawOverlays(context)
        } else {
          true
        }
        
        val appOps = context.getSystemService(android.content.Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
        } else {
            appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
        }
        val hasUsage = (mode == android.app.AppOpsManager.MODE_ALLOWED)

        if (hasOverlay && hasUsage) {
          try {
            val intent = Intent(context, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              context.startForegroundService(intent)
            } else {
              context.startService(intent)
            }
          } catch (e: Exception) {
            // Prevent SecurityException if Android restricts FGS starts from background
          }
        }
      }
    }

    Function("stopOverlay") {
      val context = appContext.reactContext
      if (context != null) {
        try {
          val intent = Intent(context, OverlayService::class.java)
          context.stopService(intent)
        } catch (e: Exception) {
          // Safely ignore if service is already stopped or context invalid
        }
      }
    }

    Function("isOverlayRunning") { ->
      return@Function OverlayService.isRunning
    }

    Function("getHomeScreenBehavior") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getString("home_screen_behavior", "show") ?: "show"
    }

    Function("setHomeScreenBehavior") { value: String ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putString("home_screen_behavior", value)?.apply()
    }

    Function("hasUsageAccess") { ->
      val context = appContext.reactContext ?: return@Function false
      val appOps = context.getSystemService(android.content.Context.APP_OPS_SERVICE) as android.app.AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          appOps.unsafeCheckOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
      } else {
          appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
      }
      return@Function mode == android.app.AppOpsManager.MODE_ALLOWED
    }

    Function("requestUsageAccess") {
      val context = appContext.reactContext
      if (context != null) {
        try {
          val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        } catch (e: Exception) {
          // Fallback for some obscure devices if needed, or just ignore to prevent crash
        }
      }
    }

    Function("getIconSize") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getString("overlay_icon_size", "small") ?: "small"
    }

    Function("setIconSize") { value: String ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putString("overlay_icon_size", value)?.apply()
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Icon size preference changed: $value")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_ICON_SIZE")
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }

    Function("getOverlayOpacity") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getFloat("overlay_opacity", 0.85f) ?: 0.85f
    }

    Function("setOverlayOpacity") { value: Float ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putFloat("overlay_opacity", value)?.apply()
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Opacity preference changed: $value")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_OPACITY")
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }

    Function("getIconSpacing") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getInt("overlay_icon_spacing", 8) ?: 8
    }

    Function("setIconSpacing") { value: Int ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putInt("overlay_icon_spacing", value)?.apply()
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Spacing preference changed: $value")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_SPACING")
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }

    Function("getSwitcherStyle") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getString("switcher_style", "with_dock") ?: "with_dock"
    }

    Function("setSwitcherStyle") { value: String ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putString("switcher_style", value)?.apply()
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Switcher style preference changed: $value")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_SWITCHER_STYLE")
          intent.putExtra("new_style", value)
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }

    Function("getDarkMode") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getBoolean("dark_mode", false) ?: false
    }

    Function("setDarkMode") { value: Boolean ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putBoolean("dark_mode", value)?.apply()
    }

    Function("getDockBackgroundColor") { ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      return@Function prefs?.getString("dock_background_color", "#1C1C1E") ?: "#1C1C1E"
    }

    Function("setDockBackgroundColor") { value: String ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putString("dock_background_color", value)?.apply()
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Dock background color changed: $value")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_DOCK_COLOR")
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }

    Function("getInstalledApps") { ->
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, String>>()
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_MAIN, null)
      intent.addCategory(Intent.CATEGORY_LAUNCHER)
      
      val resolveInfoList = pm.queryIntentActivities(intent, 0)
      val appList = mutableListOf<Map<String, String>>()
      val addedPackages = mutableSetOf<String>()
      
      for (resolveInfo in resolveInfoList) {
          val packageName = resolveInfo.activityInfo.packageName
          if (packageName == context.packageName) continue
          
          if (!addedPackages.contains(packageName)) {
              addedPackages.add(packageName)
              val label = resolveInfo.loadLabel(pm).toString()
              
              var base64Icon = ""
              try {
                  val icon = resolveInfo.loadIcon(pm)
                  val bitmap = android.graphics.Bitmap.createBitmap(
                      icon.intrinsicWidth.coerceIn(1, 96), 
                      icon.intrinsicHeight.coerceIn(1, 96), 
                      android.graphics.Bitmap.Config.ARGB_8888
                  )
                  val canvas = android.graphics.Canvas(bitmap)
                  icon.setBounds(0, 0, canvas.width, canvas.height)
                  icon.draw(canvas)
                  val stream = java.io.ByteArrayOutputStream()
                  bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, stream)
                  base64Icon = android.util.Base64.encodeToString(stream.toByteArray(), android.util.Base64.NO_WRAP)
              } catch (e: Exception) {
                  // Ignore icon errors
              }

              appList.add(mapOf(
                  "packageName" to packageName,
                  "label" to label,
                  "icon" to base64Icon
              ))
          }
      }
      
      return@Function appList.sortedBy { it["label"]?.lowercase() }
    }

    Function("getSelectedApp") { slot: Int ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      val defaultPkg = when (slot) {
          1 -> "com.whatsapp"
          2 -> "com.instagram.android"
          3 -> "com.google.android.youtube"
          else -> ""
      }
      return@Function prefs?.getString("selected_app_$slot", defaultPkg) ?: defaultPkg
    }

    Function("setSelectedApp") { slot: Int, packageName: String ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      prefs?.edit()?.putString("selected_app_$slot", packageName)?.apply()
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Selected app changed: slot $slot to $packageName")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_SELECTED_APPS")
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }

    Function("saveSelectedApps") { packages: List<String> ->
      val context = appContext.reactContext
      val prefs = context?.getSharedPreferences("QuickAppSwitcherPrefs", android.content.Context.MODE_PRIVATE)
      val editor = prefs?.edit()
      if (editor != null) {
          for (i in 1..5) {
              val pkg = if (i - 1 < packages.size) packages[i - 1] else ""
              editor.putString("selected_app_$i", pkg)
          }
          editor.apply()
      }
      
      if (context != null) {
          android.util.Log.d("QuickAppSwitcherOverlay", "Selected apps updated via saveSelectedApps")
          val intent = Intent("expo.modules.quickappswitcheroverlay.UPDATE_SELECTED_APPS")
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }
    Function("playFeedbackAnimation") { type: String ->
      val context = appContext.reactContext
      if (context != null) {
          val intent = Intent("expo.modules.quickappswitcheroverlay.PLAY_FEEDBACK_ANIMATION")
          intent.putExtra("animation_type", type)
          intent.setPackage(context.packageName)
          context.sendBroadcast(intent)
      }
    }
  }
}