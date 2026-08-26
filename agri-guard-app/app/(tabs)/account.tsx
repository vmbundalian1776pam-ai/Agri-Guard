import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';
import { useFocusEffect } from 'expo-router';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  
  const [farmers, setFarmers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const loadFarmers = useCallback(async () => {
    if (user?.role !== 'owner') return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manage_farmers.php?action=list`);
      const data = await response.json();
      if (data.status === 'success') {
        setFarmers(data.farmers);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFarmers();
    }, [loadFarmers])
  );

  const handleAddFarmer = async () => {
    if (!newUsername || !newPassword) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manage_farmers.php?action=add&username=${encodeURIComponent(newUsername)}&password=${encodeURIComponent(newPassword)}`);
      const data = await response.json();

      if (data.status === 'success') {
        Alert.alert('Success', 'Farmer account created!');
        setNewUsername('');
        setNewPassword('');
        loadFarmers();
      } else {
        Alert.alert('Error', data.message || 'Could not create account');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network request failed');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFarmer = (id: number, username: string) => {
    Alert.alert('Delete Account', `Are you sure you want to delete ${username}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/manage_farmers.php?action=delete&id=${id}`);
            const data = await response.json();
            if (data.status === 'success') {
              loadFarmers();
            } else {
              Alert.alert('Error', data.message);
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.roleLabel}>Role: {user?.role.toUpperCase()}</Text>
        </View>
      </View>

      {user?.role === 'owner' && (
        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>Manage Farmers</Text>
          
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="New Farmer Username"
              placeholderTextColor="#888"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TouchableOpacity 
              style={[styles.addBtn, isAdding && styles.disabledBtn]} 
              onPress={handleAddFarmer}
              disabled={isAdding}
            >
              <Text style={styles.addBtnText}>{isAdding ? 'Adding...' : 'Add Farmer'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subTitle}>Farmer Accounts List</Text>
          {loading ? (
            <ActivityIndicator style={{marginTop: 20}} />
          ) : (
            <FlatList
              data={farmers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.farmerRow}>
                  <View>
                    <Text style={styles.farmerName}>{item.username}</Text>
                    <Text style={styles.farmerDate}>Added: {new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteFarmer(item.id, item.username)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No farmers added yet.</Text>}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleLabel: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  adminSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 16,
  },
  addForm: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  addBtn: {
    backgroundColor: '#27ae60',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  farmerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  farmerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  farmerDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  }
});
