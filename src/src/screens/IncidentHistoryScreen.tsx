import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useEmergencyStore, IncidentLog } from '../store/useEmergencyStore';

export const IncidentHistoryScreen = ({ navigation }: any) => {
    const { incidentHistory } = useEmergencyStore();

    const renderIncident = ({ item }: { item: IncidentLog }) => {
        const date = new Date(item.timestamp);
        const formatTime = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        const isEscalated = item.status === 'Escalated';

        return (
            <View style={[styles.card, isEscalated ? styles.cardEscalated : styles.cardDismissed]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.timeText}>{formatTime}</Text>
                    <Text style={[styles.statusText, { color: isEscalated ? '#ef4444' : '#10b981' }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.label}>TRIGGER CONTEXT:</Text>
                    <Text style={styles.value}>{item.triggerReason}</Text>
                    
                    <Text style={styles.label}>SENSOR CONFIDENCE:</Text>
                    <Text style={styles.value}>{item.confidence.toFixed(1)}%</Text>

                    <Text style={styles.label}>GEMINI / AI AUDIT:</Text>
                    <Text style={styles.valueAudit}>{item.geminiVerdict}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Incident Ledger</Text>
            </View>

            {incidentHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No incidents recorded yet.</Text>
                    <Text style={styles.emptySub}>All simulated or real fall events will be logged here securely.</Text>
                </View>
            ) : (
                <FlatList
                    data={incidentHistory}
                    keyExtractor={item => item.id}
                    renderItem={renderIncident}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    backBtn: {
        paddingRight: 16,
        paddingVertical: 8,
    },
    backBtnText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    listContent: {
        paddingBottom: 40,
        gap: 16,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    cardEscalated: {
        borderColor: '#7f1d1d',
    },
    cardDismissed: {
        borderColor: '#064e3b',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        paddingBottom: 8,
    },
    timeText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardBody: {
        gap: 4,
    },
    label: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 8,
    },
    value: {
        color: '#f1f5f9',
        fontSize: 14,
    },
    valueAudit: {
        color: '#93c5fd',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptySub: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    }
});
