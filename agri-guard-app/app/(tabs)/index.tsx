import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../config';

interface Scan {
  id: number;
  field_id: number;
  image_path: string;
  result_disease: string;
  confidence: number;
  recommendation: string;
  created_at: string;
}

interface FieldStatus {
  id: number;
  name: string;
  location: string;
  status: 'healthy' | 'attention_needed' | 'unknown';
  created_at: string;
  recent_scans: Scan[];
}

export default function DashboardScreen() {
  const [fieldData, setFieldData] = useState<FieldStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFieldStatus = async () => {
    try {
      // We are simplified to one field, which is ID 1 (Eggplant Field)
      const response = await fetch(`${API_BASE_URL}/get_field_status.php?field_id=1`);
      const result = await response.json();
      if (result.status === 'success') {
        setFieldData(result.data);
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFieldStatus();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFieldStatus();
  };

  const formatConfidence = (val: any) => {
    let num = Number(val) || 0;
    if (num > 0 && num <= 1.0) {
      num = num * 100;
    }
    return num.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return '#27ae60';
    if (status === 'attention_needed') return '#e74c3c';
    return '#7f8c8d';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'healthy') return 'HEALTHY';
    if (status === 'attention_needed') return 'ATTENTION NEEDED';
    return 'NO DATA';
  };

  const formatTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateTimeStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  const scans = fieldData?.recent_scans || [];
  const latestScan = scans[0];

  const headerComponent = () => (
    <View>
      {/* Field Status Overview Card */}
      <View style={[styles.statusCard, { borderLeftColor: getStatusColor(fieldData?.status || 'unknown') }]}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.fieldName}>{fieldData?.name || 'Eggplant Field'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(fieldData?.status || 'unknown') }]}>
            <Text style={styles.statusBadgeText}>
              {getStatusLabel(fieldData?.status || 'unknown')}
            </Text>
          </View>
        </View>
        <Text style={styles.fieldLocation}>📍 Location: {fieldData?.location || 'Main Zone'}</Text>
        <Text style={styles.lastScanTime}>
          🕒 Last scanned:{' '}
          {latestScan ? formatTime(latestScan.created_at) : 'Never'}
        </Text>
      </View>

      {/* Latest Diagnosis Section */}
      {latestScan && (
        <View style={styles.latestDiagnosisCard}>
          <Text style={styles.sectionTitle}>📋 Latest Diagnosis</Text>
          <View style={styles.diagnosisInfoRow}>
            <Image
              source={{ uri: `${API_BASE_URL}/${latestScan.image_path}` }}
              style={styles.diagnosisImage}
            />
            <View style={styles.diagnosisTextContainer}>
              <Text style={styles.diseaseTitle}>{latestScan.result_disease}</Text>
              <Text style={styles.confidenceText}>
                Confidence: <Text style={styles.confidenceValue}>{formatConfidence(latestScan.confidence)}%</Text>
              </Text>
            </View>
          </View>
          {latestScan.recommendation ? (
            <View style={styles.recommendationContainer}>
              <Text style={styles.recommendationLabel}>💡 Recommendation:</Text>
              <Text style={styles.recommendationText}>{latestScan.recommendation}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* History Header */}
      <Text style={styles.historyTitle}>Scan History</Text>
      {scans.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scans yet. Use the Rover tab to scan the crops.</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={headerComponent}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Image
              source={{ uri: `${API_BASE_URL}/${item.image_path}` }}
              style={styles.historyThumbnail}
            />
            <View style={styles.historyInfo}>
              <Text style={styles.historyDisease}>{item.result_disease}</Text>
              <Text style={styles.historyMeta}>
                Confidence: {formatConfidence(item.confidence)}%  •  {formatTime(item.created_at)}
              </Text>
              {item.recommendation ? (
                <Text style={styles.historyRec} numberOfLines={2}>
                  {item.recommendation}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  fieldLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  lastScanTime: {
    fontSize: 13,
    color: '#95a5a6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  latestDiagnosisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 12,
  },
  diagnosisInfoRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  diagnosisImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#eaeaea',
  },
  diagnosisTextContainer: {
    flex: 1,
    gap: 4,
  },
  diseaseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  confidenceText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  confidenceValue: {
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  recommendationContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  recommendationLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 8,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  historyThumbnail: {
    width: 65,
    height: 65,
    borderRadius: 6,
    backgroundColor: '#eaeaea',
  },
  historyInfo: {
    flex: 1,
  },
  historyDisease: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 4,
  },
  historyRec: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
});
