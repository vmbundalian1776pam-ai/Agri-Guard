import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
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
  total_scans: number;
}

export default function DashboardScreen() {
  const [fieldData, setFieldData] = useState<FieldStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Watering System State
  const [isWatering, setIsWatering] = useState(false);
  const [waterLoading, setWaterLoading] = useState(false);

  // Scan Detail Modal State
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  // Filters
  const [filterDisease, setFilterDisease] = useState('All'); // 'All', 'Healthy', 'Disease', 'Unrecognized'
  const [filterTime, setFilterTime] = useState('All');       // 'All', 'Today', '7 Days', '30 Days'
  
  // The IP Address of the new ESP32 Watering System
  const WATER_SYSTEM_IP = 'http://192.168.100.225';

  const toggleWatering = async () => {
    setWaterLoading(true);
    try {
      const endpoint = isWatering ? '/water_off' : '/water_on';
      const response = await fetch(`${WATER_SYSTEM_IP}${endpoint}`);
      if (response.ok) {
        setIsWatering(!isWatering);
      } else {
        console.error("Failed to toggle watering system");
      }
    } catch (error) {
      console.error(error);
      alert("Could not connect to the watering system. Make sure you are on the same Wi-Fi.");
    } finally {
      setWaterLoading(false);
    }
  };

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

  const getConfidenceColor = (status: string, confidence: number) => {
    if (status === 'unknown') return '#e74c3c'; // Red for unknown/not plant
    if (confidence < 75) return '#f39c12'; // Orange for low confidence
    return '#2ecc71'; // Green for good confidence
  };

  const rawScans = fieldData?.recent_scans || [];
  const latestScan = rawScans[0];

  const filteredScans = rawScans.filter((scan) => {
    // Disease Filter
    if (filterDisease !== 'All') {
      const isHealthy = scan.result_disease.toLowerCase().includes('healthy');
      const isUnrecognized = scan.result_disease.includes('Unrecognized');
      
      if (filterDisease === 'Healthy' && !isHealthy) return false;
      if (filterDisease === 'Unrecognized' && !isUnrecognized) return false;
      if (filterDisease === 'Disease' && (isHealthy || isUnrecognized)) return false;
    }

    // Time Filter
    if (filterTime !== 'All') {
      const scanDate = new Date(scan.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - scanDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (filterTime === 'Today' && diffDays > 1) return false;
      if (filterTime === '7 Days' && diffDays > 7) return false;
      if (filterTime === '30 Days' && diffDays > 30) return false;
    }
    return true;
  });

  const headerComponent = () => (
    <View style={styles.headerWrapper}>
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

      {/* Watering System Control */}
      <View style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <View style={styles.waterTitleRow}>
            <Text style={styles.waterIcon}>💧</Text>
            <Text style={styles.sectionTitle}>Irrigation</Text>
          </View>
          <View style={styles.waterStatusBadge}>
            <Text style={styles.waterStatusText}>{isWatering ? 'RUNNING' : 'STANDBY'}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.waterBtn, isWatering ? styles.waterBtnOff : styles.waterBtnOn]} 
          onPress={toggleWatering}
          disabled={waterLoading}
          activeOpacity={0.8}
        >
          {waterLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.waterBtnText}>
              {isWatering ? 'Stop Watering' : 'Start Watering Crops'}
            </Text>
          )}
        </TouchableOpacity>
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
              <Text style={styles.diseaseTitle} numberOfLines={2}>
                {latestScan.result_disease}
              </Text>
              <Text style={styles.confidenceText}>
                Confidence:{' '}
                <Text style={[
                  styles.confidenceValue, 
                  { color: getConfidenceColor(fieldData?.status || 'unknown', Number(latestScan.confidence)) }
                ]}>
                  {formatConfidence(latestScan.confidence)}%
                </Text>
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
      <View style={styles.historyHeaderContainer}>
        <Text style={styles.historyTitle}>Scan History</Text>
        <Text style={styles.historySubtitle}>
          {(fieldData?.total_scans ?? rawScans.length)} scan{(fieldData?.total_scans ?? rawScans.length) !== 1 ? 's' : ''} · Last 2 months
        </Text>
        
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Today', '7 Days', '30 Days'].map(t => (
            <TouchableOpacity 
              key={t} 
              style={[styles.filterChip, filterTime === t && styles.filterChipActive]}
              onPress={() => setFilterTime(t)}
            >
              <Text style={[styles.filterChipText, filterTime === t && styles.filterChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Healthy', 'Disease', 'Unrecognized'].map(d => (
            <TouchableOpacity 
              key={d} 
              style={[styles.filterChip, filterDisease === d && styles.filterChipActive]}
              onPress={() => setFilterDisease(d)}
            >
              <Text style={[styles.filterChipText, filterDisease === d && styles.filterChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredScans.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scans match these filters.</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredScans}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={headerComponent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.historyCard}
            onPress={() => setSelectedScan(item)}
            activeOpacity={0.75}
          >
            <Image
              source={{ uri: `${API_BASE_URL}/${item.image_path}` }}
              style={styles.historyThumbnail}
            />
            <View style={styles.historyInfo}>
              <Text style={styles.historyDisease} numberOfLines={1}>{item.result_disease}</Text>
              <Text style={styles.historyMeta}>
                <Text style={{ color: getConfidenceColor(item.result_disease.includes('Unrecognized') ? 'unknown' : 'healthy', Number(item.confidence)), fontWeight: '600' }}>
                  {formatConfidence(item.confidence)}%
                </Text>
                {'  •  '}{formatTime(item.created_at)}
              </Text>
              {item.recommendation ? (
                <Text style={styles.historyRec} numberOfLines={2}>
                  {item.recommendation}
                </Text>
              ) : null}
            </View>
            <Text style={styles.historyChevron}>›</Text>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
      />

      {/* Scan Detail Modal */}
      <Modal
        visible={selectedScan !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedScan(null)}
      >
        {selectedScan && (
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Scan Detail</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setSelectedScan(null)}>
                <Text style={styles.modalCloseBtnText}>✕ Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Large Image */}
              <Image
                source={{ uri: `${API_BASE_URL}/${selectedScan.image_path}` }}
                style={styles.modalImage}
                resizeMode="cover"
              />

              {/* Disease Name & Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalDiseaseTitle}>{selectedScan.result_disease}</Text>
                <View style={[
                  styles.modalStatusBadge,
                  {
                    backgroundColor:
                      selectedScan.result_disease.includes('Unrecognized') ? '#FEE2E2' :
                      selectedScan.result_disease.toLowerCase().includes('healthy') ? '#DCFCE7' : '#FEF3C7'
                  }
                ]}>
                  <Text style={[
                    styles.modalStatusText,
                    {
                      color:
                        selectedScan.result_disease.includes('Unrecognized') ? '#DC2626' :
                        selectedScan.result_disease.toLowerCase().includes('healthy') ? '#16A34A' : '#D97706'
                    }
                  ]}>
                    {selectedScan.result_disease.includes('Unrecognized') ? '⚠️ Unrecognized' :
                     selectedScan.result_disease.toLowerCase().includes('healthy') ? '✅ Healthy' : '🔴 Disease Detected'}
                  </Text>
                </View>
              </View>

              {/* Confidence & Date */}
              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaItem}>
                  <Text style={styles.modalMetaLabel}>AI Confidence</Text>
                  <Text style={[
                    styles.modalMetaValue,
                    { color: getConfidenceColor(
                      selectedScan.result_disease.includes('Unrecognized') ? 'unknown' : 'healthy',
                      Number(selectedScan.confidence)
                    )}
                  ]}>
                    {formatConfidence(selectedScan.confidence)}%
                  </Text>
                </View>
                <View style={styles.modalMetaDivider} />
                <View style={styles.modalMetaItem}>
                  <Text style={styles.modalMetaLabel}>Date Scanned</Text>
                  <Text style={styles.modalMetaValue}>{formatTime(selectedScan.created_at)}</Text>
                </View>
              </View>

              {/* Full Recommendation */}
              {selectedScan.recommendation ? (
                <View style={styles.modalRecommendationCard}>
                  <Text style={styles.modalRecommendationTitle}>💡 Recommendation</Text>
                  <Text style={styles.modalRecommendationText}>{selectedScan.recommendation}</Text>
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerWrapper: {
    marginBottom: 8,
  },
  statusCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f1f1',
  },
  fieldLocation: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 6,
    fontWeight: '500',
  },
  lastScanTime: {
    fontSize: 12,
    color: '#6B7280',
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
    letterSpacing: 0.5,
  },
  waterCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f1f1',
  },
  waterStatusBadge: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waterStatusText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  waterBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  waterBtnOn: {
    backgroundColor: '#3B82F6',
  },
  waterBtnOff: {
    backgroundColor: '#EF4444',
  },
  waterBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  latestDiagnosisCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  diagnosisInfoRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  diagnosisImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  diagnosisTextContainer: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  diseaseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f1f1f1',
  },
  confidenceText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  confidenceValue: {
    fontWeight: 'bold',
  },
  recommendationContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f1f1',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  historyHeaderContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f1f1f1',
    marginBottom: 2,
  },
  historySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  filterScroll: {
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  filterChipText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#121212',
    fontWeight: '700',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  historyThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  historyInfo: {
    flex: 1,
  },
  historyDisease: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f1f1',
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  historyRec: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  historyChevron: {
    fontSize: 22,
    color: '#4B5563',
    paddingLeft: 4,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // --- Modal Styles (dark themed) ---
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f1f1f1',
    flex: 1,
  },
  modalCloseBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modalImage: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#2a2a2a',
  },
  modalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  modalDiseaseTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f1f1',
    flex: 1,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalMetaRow: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  modalMetaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  modalMetaDivider: {
    width: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 4,
  },
  modalMetaLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalMetaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f1f1',
    textAlign: 'center',
  },
  modalRecommendationCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  modalRecommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f1f1',
    marginBottom: 12,
  },
  modalRecommendationText: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 24,
  },
});
