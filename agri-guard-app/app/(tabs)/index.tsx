import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../config';

export default function DashboardScreen() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFields = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_fields.php`);
      const result = await response.json();
      if (result.status === 'success') {
        setFields(result.data);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to connect to backend. Make sure XAMPP is running and IP is correct in config.ts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFields();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFields();
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return '#27ae60';
    if (status === 'attention_needed') return '#e74c3c';
    return '#95a5a6';
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => router.push(`/field/${item.id}`)}
    >
      <View>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardLocation}>{item.location}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Fields</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2980b9" />
      ) : (
        <FlatList
          data={fields}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
  },
  cardLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
