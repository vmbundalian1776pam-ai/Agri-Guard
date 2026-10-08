import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';
import { useFocusEffect } from 'expo-router';

export default function AccountScreen() {
  const { user, logout, login } = useAuth();
  
  const [farmers, setFarmers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Modals state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameText, setEditNameText] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

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

  const fetchAuditLogs = async () => {
    if (!user) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/get_audit_logs.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setAuditLogs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleOpenAudit = () => {
    setShowAuditModal(true);
    fetchAuditLogs();
  };

  const handleChangeUsername = async () => {
    if (!editNameText.trim() || !user) return;
    setIsEditingName(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id.toString());
      formData.append('new_username', editNameText.trim());

      const res = await fetch(`${API_BASE_URL}/change_username.php`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        Alert.alert('Success', 'Username updated!');
        // Update local context
        login({ ...user, username: data.new_username });
        setShowEditNameModal(false);
      } else {
        Alert.alert('Error', data.message || 'Could not change username');
      }
    } catch (error) {
      Alert.alert('Error', 'Network request failed');
    } finally {
      setIsEditingName(false);
    }
  };

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
          <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.roleLabel}>Role: {user?.role.toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editBtn} 
          onPress={() => {
            setEditNameText(user?.username || '');
            setShowEditNameModal(true);
          }}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {user?.role === 'owner' && (
        <TouchableOpacity style={styles.auditCard} onPress={handleOpenAudit}>
          <Text style={styles.auditCardTitle}>📜 Admin Audit Trail</Text>
          <Text style={styles.auditCardSub}>View farmer login/logout activity</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'owner' && (
        <ScrollView style={styles.adminSection}>
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
              scrollEnabled={false}
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
        </ScrollView>
      )}

      {/* Edit Username Modal */}
      <Modal visible={showEditNameModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Username</Text>
            <TextInput
              style={styles.modalInput}
              value={editNameText}
              onChangeText={setEditNameText}
              placeholder="New Username"
              placeholderTextColor="#888"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditNameModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleChangeUsername} disabled={isEditingName}>
                <Text style={styles.modalSaveText}>{isEditingName ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal visible={showAuditModal} transparent animationType="slide">
        <View style={styles.modalBgFull}>
          <View style={styles.modalContainerFull}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Trail</Text>
              <TouchableOpacity onPress={() => setShowAuditModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            {auditLoading ? (
              <ActivityIndicator size="large" color="#2ecc71" style={{marginTop: 50}} />
            ) : (
              <FlatList
                data={auditLogs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.logCard}>
                    <View style={styles.logInfo}>
                      <Text style={styles.logUser}>User: {item.username}</Text>
                      <Text style={styles.logTime}>{new Date(item.created_at).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.logBadge, { backgroundColor: item.action === 'login' ? '#2ecc71' : '#e74c3c' }]}>
                      <Text style={styles.logActionText}>{item.action.toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No audit logs found.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  logoutBtn: { backgroundColor: '#e74c3c', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutBtnText: { color: '#fff', fontWeight: 'bold' },
  profileCard: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#27ae60', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  username: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  roleLabel: { fontSize: 14, color: '#aaa', marginTop: 4 },
  editBtn: { backgroundColor: '#333', padding: 8, borderRadius: 8 },
  editBtnText: { color: '#fff', fontSize: 14 },
  auditCard: { backgroundColor: '#2c3e50', padding: 20, borderRadius: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#3498db' },
  auditCardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  auditCardSub: { color: '#bdc3c7', fontSize: 14 },
  adminSection: { flex: 1 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#27ae60', marginBottom: 16 },
  addForm: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, marginBottom: 24 },
  input: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  addBtn: { backgroundColor: '#27ae60', padding: 14, borderRadius: 8, alignItems: 'center' },
  disabledBtn: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  subTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  farmerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: 16, borderRadius: 8, marginBottom: 10 },
  farmerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  farmerDate: { color: '#888', fontSize: 12, marginTop: 4 },
  deleteBtn: { backgroundColor: 'rgba(231, 76, 60, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { color: '#e74c3c', fontWeight: 'bold' },
  emptyText: { color: '#888', textAlign: 'center', fontStyle: 'italic', marginTop: 20 },

  /* Modals */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1e1e1e', width: '100%', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancel: { padding: 12, marginRight: 10 },
  modalCancelText: { color: '#aaa', fontWeight: 'bold' },
  modalSave: { backgroundColor: '#2ecc71', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },

  modalBgFull: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', paddingTop: 60 },
  modalContainerFull: { flex: 1, backgroundColor: '#121212', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCloseText: { color: '#e74c3c', fontSize: 16, fontWeight: 'bold' },
  logCard: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logInfo: { flex: 1 },
  logUser: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  logTime: { color: '#aaa', fontSize: 12 },
  logBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  logActionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
