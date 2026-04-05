package com.emergencyapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.view.KeyEvent
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  private var isVolumeUpPressed = false
  private var isVolumeDownPressed = false
  private var volumeUpStartTime: Long = 0
  private var volumeDownStartTime: Long = 0
  private val LONG_PRESS_THRESHOLD = 3000L

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      if (!isVolumeUpPressed) {
        isVolumeUpPressed = true
        MainApplication.isVolumeUpHeld = true
        volumeUpStartTime = System.currentTimeMillis()
        Log.d("ShadowLink", "[Key] Volume UP Down")
      }
      checkChord()
      return true
    }
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      if (!isVolumeDownPressed) {
        isVolumeDownPressed = true
        MainApplication.isVolumeDownHeld = true
        volumeDownStartTime = System.currentTimeMillis()
        Log.d("ShadowLink", "[Key] Volume DOWN Down")
      }
      checkChord()
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    val now = System.currentTimeMillis()
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      if (isVolumeUpPressed && (now - volumeUpStartTime >= LONG_PRESS_THRESHOLD)) {
        Log.i("ShadowLink", "[Trigger] MEDICAL Trigger (UP Hold)")
        emitHardwareEvent("volume_up_hold")
      }
      isVolumeUpPressed = false
      MainApplication.isVolumeUpHeld = false
      return true
    }
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      if (isVolumeDownPressed && (now - volumeDownStartTime >= LONG_PRESS_THRESHOLD)) {
        Log.i("ShadowLink", "[Trigger] ACCIDENT Trigger (DOWN Hold)")
        emitHardwareEvent("volume_down_hold")
      }
      isVolumeDownPressed = false
      MainApplication.isVolumeDownHeld = false
      return true
    }
    return super.onKeyUp(keyCode, event)
  }

  private fun checkChord() {
    if (isVolumeUpPressed && isVolumeDownPressed) {
      Log.i("ShadowLink", "[Trigger] DISASTER Trigger (UP+DOWN Chord)")
      emitHardwareEvent("volume_chord")
    }
  }

  private fun emitHardwareEvent(type: String) {
    try {
      // 🛰️ NEW ARCH / BRIDGELESS COMPATIBLE ACCESS
      val reactHost = (application as MainApplication).reactHost
      val context = reactHost.currentReactContext
      
      if (context != null) {
        val params = Arguments.createMap()
        params.putString("type", type)
        context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("HardwareKeyEvent", params)
        Log.i("ShadowLink", "[Bridge] Success: Emitted $type")
      } else {
        Log.w("ShadowLink", "[Bridge] Context is null, cannot emit $type")
      }
    } catch (e: Exception) {
      Log.e("ShadowLink", "[Bridge] Critical failure emitting $type", e)
    }
  }

  override fun getMainComponentName(): String = "EmergencyApp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
