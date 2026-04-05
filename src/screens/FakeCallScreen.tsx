import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, SafeAreaView, StatusBar } from 'react-native';
import { useEmergencyStore } from '../store/useEmergencyStore';

export const FakeCallScreen = ({ navigation }: any) => {
    const { setFakeCallActive } = useEmergencyStore();
    const [pulse] = useState(new Animated.Value(1));
    const [callDuration, setCallDuration] = useState(0);
    const [isCallAccepted, setIsCallAccepted] = useState(false);

    useEffect(() => {
        if (!isCallAccepted) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            const timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isCallAccepted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndCall = () => {
        setFakeCallActive(false);
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>D</Text>
                </View>
                <Text style={styles.callerName}>Dad</Text>
                <Text style={styles.callerStatus}>
                    {isCallAccepted ? formatTime(callDuration) : 'Mobile +1 555-0199'}
                </Text>
            </View>

            {!isCallAccepted ? (
                <View style={styles.incomingActions}>
                    <View style={styles.actionColumn}>
                        <Animated.View style={{ transform: [{ scale: pulse }] }}>
                            <TouchableOpacity 
                                style={[styles.btn, styles.declineBtn]}
                                onPress={handleEndCall}
                            >
                                <Text style={styles.btnIcon}>📞</Text>
                            </TouchableOpacity>
                        </Animated.View>
                        <Text style={styles.actionLabel}>Decline</Text>
                    </View>

                    <View style={styles.actionColumn}>
                        <Animated.View style={{ transform: [{ scale: pulse }] }}>
                            <TouchableOpacity 
                                style={[styles.btn, styles.acceptBtn]}
                                onPress={() => setIsCallAccepted(true)}
                            >
                                <Text style={styles.btnIcon}>📞</Text>
                            </TouchableOpacity>
                        </Animated.View>
                        <Text style={styles.actionLabel}>Accept</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.activeActions}>
                    <View style={styles.activeRow}>
                        <View style={styles.activeItem}>
                            <View style={styles.miniCircle}><Text>🔇</Text></View>
                            <Text style={styles.miniLabel}>Mute</Text>
                        </View>
                        <View style={styles.activeItem}>
                            <View style={styles.miniCircle}><Text>🔢</Text></View>
                            <Text style={styles.miniLabel}>Keypad</Text>
                        </View>
                        <View style={styles.activeItem}>
                            <View style={styles.miniCircle}><Text>🔊</Text></View>
                            <Text style={styles.miniLabel}>Speaker</Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.btn, styles.declineBtn, styles.endBtnLarge]}
                        onPress={handleEndCall}
                    >
                        <Text style={styles.btnIcon}>📞</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1c1c1e',
        justifyContent: 'space-between',
        paddingVertical: 80,
    },
    header: {
        alignItems: 'center',
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#48484a',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    avatarText: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
    },
    callerName: {
        color: 'white',
        fontSize: 34,
        fontWeight: '400',
        marginBottom: 8,
    },
    callerStatus: {
        color: '#8e8e93',
        fontSize: 18,
    },
    incomingActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 40,
    },
    activeActions: {
        alignItems: 'center',
        width: '100%',
    },
    activeRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 60,
    },
    activeItem: {
        alignItems: 'center',
    },
    miniCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2c2c2e',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    miniLabel: {
        color: 'white',
        fontSize: 14,
    },
    actionColumn: {
        alignItems: 'center',
    },
    btn: {
        width: 75,
        height: 75,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    declineBtn: {
        backgroundColor: '#ff3b30',
        transform: [{ rotate: '135deg' }],
    },
    acceptBtn: {
        backgroundColor: '#34c759',
    },
    endBtnLarge: {
        width: 80,
        height: 80,
    },
    btnIcon: {
        fontSize: 30,
        color: 'white',
    },
    actionLabel: {
        color: 'white',
        fontSize: 16,
    },
});
