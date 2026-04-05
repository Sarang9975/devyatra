import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { request, requestMultiple, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

interface Props {
    onAllGranted: () => void;
}

const REQUIRED_PERMISSIONS = [
    {
        id: 'mic',
        permission: PERMISSIONS.ANDROID.RECORD_AUDIO,
        icon: '🎙️',
        title: 'Microphone',
        reason: 'Speak voice commands to the AI during emergencies.',
    },
    {
        id: 'torch',
        permission: PERMISSIONS.ANDROID.CAMERA,
        icon: '🔦',
        title: 'Camera / Flashlight',
        reason: 'Activate the SOS rescue beacon strobe light.',
    },
    {
        id: 'loc',
        permission: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        icon: '📍',
        title: 'Location',
        reason: 'Share your GPS coordinates in SOS messages.',
    },
    {
        id: 'sms',
        permission: PERMISSIONS.ANDROID.SEND_SMS,
        icon: '💬',
        title: 'Send SMS',
        reason: 'Automatically alert your emergency contacts.',
    },
    {
        id: 'call',
        permission: PERMISSIONS.ANDROID.CALL_PHONE,
        icon: '📞',
        title: 'Phone Calls',
        reason: 'Automatically call emergency contacts or services.',
    },
    {
        id: 'notif',
        permission: (PERMISSIONS.ANDROID as any).POST_NOTIFICATIONS,
        icon: '🔔',
        title: 'Notifications',
        reason: 'Display critical emergency status and SOS alerts.',
    },
];

export const PermissionSetupScreen: React.FC<Props> = ({ onAllGranted }) => {
    const [isRequesting, setIsRequesting] = useState(false);
    const [status, setStatus] = useState<string>('');

    const handleGrantAll = async () => {
        if (Platform.OS !== 'android') {
            onAllGranted();
            return;
        }
        setIsRequesting(true);
        setStatus('Requesting permissions...');

        try {
            const permsToRequest = REQUIRED_PERMISSIONS.map(p => p.permission);
            const results = await requestMultiple(permsToRequest);

            const denied = Object.entries(results).filter(
                ([, res]) => res !== RESULTS.GRANTED && res !== RESULTS.UNAVAILABLE
            );

            if (denied.length === 0) {
                setStatus('All permissions granted!');
                setTimeout(() => onAllGranted(), 500);
            } else {
                const deniedNames = denied.map(([perm]) =>
                    REQUIRED_PERMISSIONS.find(p => p.permission === perm)?.title || perm
                ).join(', ');
                setStatus(`Denied: ${deniedNames}. Please allow in Settings.`);
                setIsRequesting(false);
            }
        } catch (e) {
            console.error('[PermissionSetup] Error:', e);
            setStatus('Error requesting permissions. Please try again.');
            setIsRequesting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.shield}>🛡️</Text>
                <Text style={styles.title}>Emergency App</Text>
                <Text style={styles.subtitle}>
                    To protect you in an emergency, this app requires a few critical permissions.
                </Text>
            </View>

            <View style={styles.permList}>
                {REQUIRED_PERMISSIONS.map((p) => (
                    <View key={p.id} style={styles.permRow}>
                        <Text style={styles.permIcon}>{p.icon}</Text>
                        <View style={styles.permText}>
                            <Text style={styles.permTitle}>{p.title}</Text>
                            <Text style={styles.permReason}>{p.reason}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {status ? (
                <Text style={styles.statusText}>{status}</Text>
            ) : null}

            <TouchableOpacity
                style={[styles.btn, isRequesting && styles.btnDisabled]}
                onPress={handleGrantAll}
                disabled={isRequesting}
            >
                <Text style={styles.btnText}>
                    {isRequesting ? 'Requesting...' : 'Grant All Permissions'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openSettings()}>
                <Text style={styles.settingsLink}>Open App Settings</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingHorizontal: 28,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    shield: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 22,
    },
    permList: {
        gap: 16,
        marginBottom: 32,
    },
    permRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 14,
        padding: 16,
        gap: 14,
    },
    permIcon: {
        fontSize: 28,
    },
    permText: {
        flex: 1,
    },
    permTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#f1f5f9',
        marginBottom: 3,
    },
    permReason: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    statusText: {
        color: '#fbbf24',
        textAlign: 'center',
        marginBottom: 16,
        fontSize: 13,
    },
    btn: {
        backgroundColor: '#ef4444',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 16,
    },
    btnDisabled: {
        backgroundColor: '#7f1d1d',
    },
    btnText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    settingsLink: {
        color: '#3b82f6',
        fontSize: 14,
        textAlign: 'center',
    },
});
