import { PermissionsAndroid, Platform } from 'react-native';

/**
 * All permissions required by the Emergency App.
 * Called ONCE on app startup to avoid mid-session permission dialogs.
 */
export const requestAllPermissions = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;

    const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
    ];

    try {
        const results = await PermissionsAndroid.requestMultiple(permissions);

        const denied = Object.entries(results)
            .filter(([, status]) => status !== PermissionsAndroid.RESULTS.GRANTED)
            .map(([perm]) => perm);

        if (denied.length > 0) {
            console.warn('[Permissions] The following permissions were denied:', denied);
            console.warn('[Permissions] Some emergency features may not work correctly.');
        } else {
            console.log('[Permissions] All emergency permissions granted.');
        }
    } catch (e) {
        console.error('[Permissions] Error requesting permissions:', e);
    }
};
