import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../config';

export default function FieldDetailScreen() {
  const { id } = useLocalSearchParams();
  const [field, setField] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFieldData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_field_status.php?field_id=${id}`);
      const result = await response.json();
      if (result.status === 'success') {
        setField(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch field data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFieldData();
  }, [id]);

  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You need to allow access to your photos to upload an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (imageAsset: any) => {
    setUploading(true);
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('field_id', id as string);
    formData.append('image', {
      uri: imageAsset.uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch(`${API_BASE_URL}/upload_image.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        Alert.alert(
          'Analysis Complete', 
          `Status: ${result.data.field_status}\nDisease: ${result.data.disease}\nRecommendation: ${result.data.recommendation}`
        );
        // Refresh data to show new scan
        fetchFieldData();
      } else {
        Alert.alert('Upload Failed', result.message);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to upload image. Make sure your API key is set in upload_image.php and the server is running.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  if (!field) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Field not found.</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return '#27ae60';
    if (status === 'attention_needed') return '#e74c3c';
    return '#95a5a6';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{field.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(field.status) }]}>
          <Text style={styles.statusText}>{field.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Manual Scan</Text>
        <Text style={styles.sectionSubtitle}>Upload an image to test the Gemini AI detection.</Text>
        
        <TouchableOpacity 
          style={styles.uploadBtn} 
          onPress={pickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {field.recent_scans && field.recent_scans.length > 0 ? (
          field.recent_scans.map((scan: any) => (
            <View key={scan.id} style={styles.scanCard}>
              <View style={styles.scanInfo}>
                <Text style={styles.scanDate}>{new Date(scan.created_at).toLocaleString()}</Text>
                <Text style={styles.scanResult}>Disease: {scan.result_disease}</Text>
                <Text style={styles.scanConfidence}>Confidence: {(scan.confidence * 100).toFixed(0)}%</Text>
                {scan.recommendation ? (
                  <Text style={styles.scanRec}>{scan.recommendation}</Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No scans available yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'flex-start',
  },
  backBtn: {
    marginBottom: 10,
  },
  backText: {
    color: '#2980b9',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  uploadBtn: {
    backgroundColor: '#2980b9',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historySection: {
    margin: 15,
  },
  scanCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scanInfo: {
    flex: 1,
  },
  scanDate: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 5,
  },
  scanResult: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scanConfidence: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  scanRec: {
    fontSize: 14,
    color: '#d35400',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noData: {
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  }
});
