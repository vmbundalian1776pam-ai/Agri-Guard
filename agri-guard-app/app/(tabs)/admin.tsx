import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '../../config';

export default function AdminScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/get_audit_logs.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.headerTitle}>Admin Audit Trail</Text>
      <Text style={styles.subHeader}>Tracking farmer login/logout activity</Text>

      <FlatList
        data={logs}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={styles.logInfo}>
              <Text style={styles.logUser}>User: {item.username}</Text>
              <Text style={styles.logTime}>{formatTime(item.created_at)}</Text>
            </View>
            <View style={[styles.badge, item.action === 'login' ? styles.badgeLogin : styles.badgeLogout]}>
              <Text style={[styles.badgeText, item.action === 'login' ? styles.textLogin : styles.textLogout]}>
                {item.action.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f1f1',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  subHeader: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContainer: {
    padding: 16,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  logInfo: {
    flex: 1,
  },
  logUser: {
    color: '#f1f1f1',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  logTime: {
    color: '#6B7280',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeLogin: {
    backgroundColor: '#064e3b',
  },
  badgeLogout: {
    backgroundColor: '#7f1d1d',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textLogin: {
    color: '#34d399',
  },
  textLogout: {
    color: '#f87171',
  },
});
