package com.emergencyapp

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.emergencyapp.SpeechPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(SpeechPackage())
        },
    )
  }

  /**
   * GLOBAL SAFETY NET FOR ANDROID 14 (API 34+).
   * Fixed syntax for registerReceiver to be compatible with both new and old SDKs.
   */
  override fun registerReceiver(receiver: BroadcastReceiver?, filter: IntentFilter?): Intent? {
    return if (Build.VERSION.SDK_INT >= 34) {
      super.registerReceiver(receiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      super.registerReceiver(receiver, filter)
    }
  }

  companion object {
    var isVolumeUpHeld = false
    var isVolumeDownHeld = false
  }

  private var screenToggleCount = 0
  private var lastToggleTime: Long = 0

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      val now = System.currentTimeMillis()

      // ✉️ TACTICAL SMS CHORD: Vol UP + Power
      if (isVolumeUpHeld) {
        Log.i("ShadowLink", "[Trigger] TACTICAL SMS (Power + Vol UP)")
        emitHardwareEvent("hardware_sms_action")
        return
      }

      // 📞 TACTICAL CALL CHORD: Vol DOWN + Power
      if (isVolumeDownHeld) {
        Log.i("ShadowLink", "[Trigger] TACTICAL CALL (Power + Vol DOWN)")
        emitHardwareEvent("hardware_call_action")
        return
      }

      if (now - lastToggleTime > 3000) {
        screenToggleCount = 0
      }
      lastToggleTime = now
      screenToggleCount++

      Log.d("ShadowLink", "[Native] Screen Toggle detected: $screenToggleCount")

      if (screenToggleCount >= 4) {
        screenToggleCount = 0
        Log.i("ShadowLink", "[Native] POWER SPAM DETECTED - Emitting Trigger")
        emitHardwareEvent("power_spam")
      }
    }
  }

  private fun emitHardwareEvent(type: String) {
    try {
      val context = reactHost.currentReactContext
      if (context != null) {
        val params = Arguments.createMap()
        params.putString("type", type)
        context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("HardwareKeyEvent", params)
      }
    } catch (e: Exception) {
      Log.e("ShadowLink", "Failed to emit hardware event", e)
    }
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)

    // Shadow-Link Activity Listener
    val filter = IntentFilter()
    filter.addAction(Intent.ACTION_SCREEN_ON)
    filter.addAction(Intent.ACTION_SCREEN_OFF)
    registerReceiver(screenReceiver, filter)
  }
}
