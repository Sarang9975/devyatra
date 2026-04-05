package com.emergencyapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.telephony.SmsManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var speechRecognizer: SpeechRecognizer? = null

    /**
     * NATIVE GPS HANDLER: Fixed the 'app quitting' issue by using a safe, 
     * non-crashing system-level location fetcher.
     */
    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        val context = reactApplicationContext
        val locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE) as? android.location.LocationManager
        
        if (locationManager == null) {
            promise.reject("UNAVAILABLE", "Location service not available")
            return
        }

        try {
            // Check permissions explicitly in Kotlin for stability
            val hasFine = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
            val hasCoarse = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
            
            if (!hasFine && !hasCoarse) {
                promise.reject("PERMISSION_DENIED", "GPS permissions missing")
                return
            }

            // Try Passive/Cached location first for instant response (no-wait)
            val lastLocation = locationManager.getLastKnownLocation(android.location.LocationManager.PASSIVE_PROVIDER) ?: 
                               locationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER) ?:
                               locationManager.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)

            if (lastLocation != null) {
                val map = Arguments.createMap()
                map.putDouble("latitude", lastLocation.latitude)
                map.putDouble("longitude", lastLocation.longitude)
                promise.resolve(map)
                return
            }

            // Request fresh location
            val listener = object : android.location.LocationListener {
                override fun onLocationChanged(location: android.location.Location) {
                    val map = Arguments.createMap()
                    map.putDouble("latitude", location.latitude)
                    map.putDouble("longitude", location.longitude)
                    promise.resolve(map)
                    locationManager.removeUpdates(this)
                }
                override fun onStatusChanged(p0: String?, p1: Int, p2: android.os.Bundle?) {}
                override fun onProviderEnabled(p0: String) {}
                override fun onProviderDisabled(p0: String) {}
            }

            locationManager.requestSingleUpdate(android.location.LocationManager.NETWORK_PROVIDER, listener, null)
            
        } catch (e: SecurityException) {
            promise.reject("SECURITY_ERROR", e.message)
        } catch (e: Exception) {
            promise.reject("GPS_ERROR", e.message)
        }
    }

    override fun getName() = "EmergencySpeech"

    @ReactMethod
    fun startListening(promise: Promise) {
        val context = reactApplicationContext

        UiThreadUtil.runOnUiThread {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(context)) {
                    promise.reject("UNAVAILABLE", "Speech recognition not available on this device")
                    return@runOnUiThread
                }

                speechRecognizer?.destroy()
                speechRecognizer = null

                // Small pause to allow audio routing to fully switch from TTS output to mic input
                android.os.SystemClock.sleep(100)

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)

                speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                    override fun onEndOfSpeech() {}

                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val params = Arguments.createMap()
                        val arr = Arguments.createArray()
                        matches?.forEach { arr.pushString(it) }
                        params.putArray("value", arr)
                        sendEvent("EmergencySpeechResults", params)
                    }

                    override fun onError(error: Int) {
                        val params = Arguments.createMap()
                        params.putInt("error", error)
                        sendEvent("EmergencySpeechError", params)
                    }
                })

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
                    // Give user more time to start speaking (reduces Error 7)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 500L)
                }

                speechRecognizer?.startListening(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                speechRecognizer?.stopListening()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false) // Don't crash if already stopped
            }
        }
    }

    @ReactMethod
    fun destroy(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            speechRecognizer?.destroy()
            speechRecognizer = null
            promise.resolve(true)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Required for RCTEventEmitter compatibility
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    /**
     * Directly place a phone call using ACTION_CALL (no dialer UI).
     * Requires CALL_PHONE permission.
     */
    @ReactMethod
    fun makeCall(phoneNumber: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$phoneNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_ERROR", e.message)
        }
    }

    /**
     * Send an SMS silently in the background.
     * Simplified version to prevent 'App closing' (native crashes).
     * Requires SEND_SMS permission.
     */
    @ReactMethod
    fun sendSilentSMS(phoneNumber: String, message: String, promise: Promise) {
        if (phoneNumber.isEmpty() || message.isEmpty()) {
            promise.reject("INVALID_INPUT", "Number or message is empty")
            return
        }

        try {
            val smsManager = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                reactApplicationContext.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            if (smsManager == null) {
                promise.reject("SMS_ERROR", "SmsManager not available")
                return
            }

            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                // Send multi-part if too long
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            } else {
                // Single part for speed and reliability
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            }

            android.util.Log.d("EmergencySpeech", "SMS sent to: $phoneNumber")
            promise.resolve(true)
        } catch (e: SecurityException) {
            android.util.Log.e("EmergencySpeech", "Security Error: ${e.message}")
            promise.reject("PERMISSION_DENIED", "SEND_SMS permission missing")
        } catch (e: Exception) {
            android.util.Log.e("EmergencySpeech", "Native SMS Crash Avoided: ${e.message}")
            promise.reject("NATIVE_ERROR", e.message)
        }
    }
}
