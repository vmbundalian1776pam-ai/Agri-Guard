import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Load the MJPEG stream in an HTML page with auto-refresh fallback
const getStreamHtml = (ip: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    img { width: 100%; height: 100%; object-fit: contain; }
    #status {
      display: none;
      color: #888;
      font-family: sans-serif;
      font-size: 13px;
      text-align: center;
      padding: 20px;
      position: absolute;
    }
  </style>
</head>
<body>
  <img id="s" src="http://${ip}:81/stream" />
  <div id="status">Connecting to stream...</div>
  <script>
    var img = document.getElementById('s');
    var status = document.getElementById('status');
    status.style.display = 'block';
    img.onload = function() { status.style.display = 'none'; };
    img.onerror = function() {
      status.innerText = 'Stream error. Retrying...';
      setTimeout(function() {
        img.src = 'http://${ip}:81/stream?' + Date.now();
      }, 3000);
    };
  </script>
</body>
</html>
`;

interface ScanResult {
  disease: string;
  confidence: number;
  recommendation: string;
  field_status: string;
  image_url: string;
}

export default function RoverScreen() {
  const [roverIp, setRoverIp] = useState('');
  const [connectedIp, setConnectedIp] = useState('');
  const [lightOn, setLightOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [patrolStep, setPatrolStep] = useState('');
  const patrolActiveRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  // Soil Moisture State
  const [moistureData, setMoistureData] = useState<{ percentage: number; level: string; needsWatering: boolean } | null>(null);
  const [moistureLoading, setMoistureLoading] = useState(false);
  const [samplingText, setSamplingText] = useState('');

  const measureSoilMoisture = async () => {
    if (!connectedIp) {
      Alert.alert('Not Connected', 'Please connect to a Rover IP first.');
      return;
    }
    setMoistureLoading(true);
    setSamplingText('Sampling soil moisture for 3 seconds...');

    try {
      // Simulate 2.5 second sampling duration for realistic sensor reading
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const response = await fetch(`http://${connectedIp}/read_moisture`);
      const data = await response.json();
      if (data.status === 'success') {
        const percentage = Number(data.moisture);
        const needsWatering = percentage < 35; // Under 35% means field needs irrigation
        setMoistureData({ percentage, level: data.level, needsWatering });

        // Sync reading with backend database so Home screen gets updated
        try {
          await fetch(`${API_BASE_URL}/save_moisture.php?field_id=1&moisture=${percentage}`);
        } catch (err) {
          console.error('Failed to sync moisture to backend', err);
        }
      } else {
        Alert.alert('Error', 'Could not read soil moisture data from Rover.');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Failed to reach Rover moisture sensor. Ensure sensor is wired to pin IO0.');
    } finally {
      setMoistureLoading(false);
      setSamplingText('');
    }
  };

  // Saved IPs
  const [savedIps, setSavedIps] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load saved IPs from storage on mount
  useEffect(() => {
    const loadSavedIps = async () => {
      try {
        const stored = await AsyncStorage.getItem('savedRoverIps');
        if (stored) setSavedIps(JSON.parse(stored));
      } catch (e) {}
    };
    loadSavedIps();
  }, []);

  const saveCurrentIp = async (ip: string) => {
    if (!ip.trim()) return;
    const updated = [ip.trim(), ...savedIps.filter(s => s !== ip.trim())].slice(0, 5); // keep max 5
    setSavedIps(updated);
    await AsyncStorage.setItem('savedRoverIps', JSON.stringify(updated));
  };

  const deleteIp = async (ip: string) => {
    const updated = savedIps.filter(s => s !== ip);
    setSavedIps(updated);
    await AsyncStorage.setItem('savedRoverIps', JSON.stringify(updated));
  };

  const sendCommand = async (action: string) => {
    if (!connectedIp) return;
    try {
      const url = `http://${connectedIp}/${action}?${Date.now()}`;
      await fetch(url, { method: 'GET' });
    } catch (e) {
      // ignore network errors from rover
    }
  };

  const handleConnect = () => {
    Keyboard.dismiss();
    setShowDropdown(false);
    if (roverIp.trim()) {
      setConnectedIp(roverIp.trim());
      saveCurrentIp(roverIp.trim());
    }
  };

  const handleSelectIp = (ip: string) => {
    setRoverIp(ip);
    setConnectedIp(ip);
    setShowDropdown(false);
    saveCurrentIp(ip);
  };

  const handleScan = async () => {
    if (!connectedIp) return;
    setIsScanning(true);
    // IMPORTANT: Pause the video stream so the ESP32's single stream worker is freed up for PHP to connect
    setIsScanMode(true);
    // Wait 2 seconds for the WebView to fully disconnect from the stream
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const response = await fetch(`${API_BASE_URL}/rover_scan.php?rover_ip=${connectedIp}`);
      const result = await response.json();
      if (result.status === 'success') {
        setScanResult(result.data);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to scan image. Ensure XAMPP is running, Python AI server is running, and the Rover is reachable.');
    } finally {
      setIsScanning(false);
      // Resume the video stream
      setIsScanMode(false);
    }
  };

  const formatConfidence = (val: any) => {
    let num = Number(val) || 0;
    if (num > 0 && num <= 1.0) {
      num = num * 100;
    }
    return num.toFixed(2);
  };

  const stopPatrol = () => {
    patrolActiveRef.current = false;
    setIsPatrolling(false);
    setPatrolStep('');
    sendCommand('stop');
  };

  const startPatrol = async () => {
    if (!connectedIp) return;
    patrolActiveRef.current = true;
    setIsPatrolling(true);

    let cycle = 0;
    while (patrolActiveRef.current) {
      cycle++;
      // Step 1: Drive forward
      setPatrolStep(`Cycle ${cycle}: Moving forward...`);
      sendCommand('go');
      await new Promise(r => setTimeout(r, 3000));
      if (!patrolActiveRef.current) break;

      // Step 2: Stop
      sendCommand('stop');
      setPatrolStep(`Cycle ${cycle}: Stopped — preparing to scan...`);
      await new Promise(r => setTimeout(r, 1000));
      if (!patrolActiveRef.current) break;

      // Step 3: Scan crop (same as tapping Scan Crop manually)
      setPatrolStep(`Cycle ${cycle}: Scanning crop...`);
      setIsScanning(true);
      setIsScanMode(true);
      await new Promise(r => setTimeout(r, 2000));

      if (!patrolActiveRef.current) {
        setIsScanning(false);
        setIsScanMode(false);
        break;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/rover_scan.php?rover_ip=${connectedIp}`);
        const result = await response.json();
        if (result.status === 'success') {
          setScanResult(result.data);
          // Patrol pauses here — resumes when user closes the result modal
          patrolActiveRef.current = false;
          setIsPatrolling(false);
          setPatrolStep('');
        }
      } catch (error) {
        console.error('Patrol scan failed:', error);
      } finally {
        setIsScanning(false);
        setIsScanMode(false);
      }

      // Wait a moment before next cycle
      await new Promise(r => setTimeout(r, 1000));
    }

    sendCommand('stop');
    setIsPatrolling(false);
    setPatrolStep('');
  };

  const toggleLight = () => {
    const cmd = lightOn ? 'ledoff' : 'ledon';
    sendCommand(cmd);
    setLightOn(!lightOn);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🤖 Rover Control</Text>
        </View>

        {/* IP Input Row */}
        <View style={styles.ipRow}>
          <TextInput
            ref={inputRef}
            style={styles.ipInput}
            value={roverIp}
            onChangeText={setRoverIp}
            placeholder="Rover IP e.g. 192.168.100.177"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleConnect}
            onFocus={() => savedIps.length > 0 && setShowDropdown(true)}
            autoCorrect={false}
          />
          {savedIps.length > 0 && (
            <TouchableOpacity
              style={styles.dropdownToggle}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>▾</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
            <Text style={styles.connectBtnText}>Connect</Text>
          </TouchableOpacity>
        </View>

        {/* Saved IPs Dropdown */}
        {showDropdown && savedIps.length > 0 && (
          <View style={styles.dropdown}>
            {savedIps.map((ip) => (
              <View key={ip} style={styles.dropdownRow}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelectIp(ip)}
                >
                  <Text style={styles.dropdownItemText}>📡 {ip}</Text>
                  {ip === connectedIp && (
                    <Text style={styles.dropdownConnectedBadge}>✅ Connected</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownDeleteBtn}
                  onPress={() => deleteIp(ip)}
                >
                  <Text style={styles.dropdownDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Connection status */}
        {connectedIp ? (
          <Text style={styles.statusText}>✅ Connected to {connectedIp}</Text>
        ) : (
          <Text style={styles.statusText}>Enter the rover's IP address and tap Connect</Text>
        )}

        {/* Camera Feed */}
        <View style={styles.cameraContainer}>
          {connectedIp ? (
            isScanMode ? (
              // Blank page shown while scanning — this disconnects the stream so ESP32 is free
              <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{ color: '#aaa', marginTop: 12, fontSize: 13 }}>📸 Capturing image...</Text>
              </View>
            ) : (
              <WebView
                source={{ html: getStreamHtml(connectedIp) }}
                style={styles.camera}
                scrollEnabled={false}
                bounces={false}
                originWhitelist={['*']}
                mixedContentMode="always"
                javaScriptEnabled={true}
                cacheEnabled={false}
              />
            )
          ) : (
            <View style={styles.cameraPlaceholder}>
              <IconSymbol name="camera.fill" size={36} color="#444" />
              <Text style={styles.cameraPlaceholderText}>No stream</Text>
            </View>
          )}
        </View>

        {/* Action Controls & D-Pad */}
        <View style={styles.controls}>
          {/* Forward */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPressIn={() => sendCommand('go')}
              onPressOut={() => sendCommand('stop')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.up" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Left / Stop / Right */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPressIn={() => sendCommand('left')}
              onPressOut={() => sendCommand('stop')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnRed]}
              onPress={() => sendCommand('stop')}
              activeOpacity={0.7}
            >
              <IconSymbol name="stop.fill" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPressIn={() => sendCommand('right')}
              onPressOut={() => sendCommand('stop')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.right" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Backward */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPressIn={() => sendCommand('back')}
              onPressOut={() => sendCommand('stop')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.down" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Scan & Light Controls */}
          <View style={[styles.row, { marginTop: 14, gap: 14 }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: connectedIp ? '#3498db' : '#333' }]}
              onPress={handleScan}
              disabled={!connectedIp || isScanning || isPatrolling}
              activeOpacity={0.8}
            >
              {isScanning && !isPatrolling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>📸 Scan Crop</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: lightOn ? '#f5c542' : '#2c3e50' }]}
              onPress={toggleLight}
              disabled={!connectedIp}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {lightOn ? '💡 Light ON' : '🌑 Light OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auto Patrol Button */}
          <View style={[styles.row, { marginTop: 10 }]}>
            <TouchableOpacity
              style={[
                styles.patrolBtn,
                { backgroundColor: !connectedIp ? '#333' : isPatrolling ? '#e74c3c' : '#8e44ad' }
              ]}
              onPress={isPatrolling ? stopPatrol : startPatrol}
              disabled={!connectedIp || isScanning}
              activeOpacity={0.8}
            >
              {isPatrolling && isScanning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {isPatrolling ? '⏹ Stop Patrol' : '🤖 Auto Patrol'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Patrol Status */}
          {isPatrolling && patrolStep ? (
            <Text style={styles.patrolStatus}>{patrolStep}</Text>
          ) : null}

          {/* Soil Moisture Control & Telemetry Card */}
          <View style={styles.moistureCard}>
            <View style={styles.moistureHeaderRow}>
              <Text style={styles.moistureTitle}>🌱 Soil Moisture Telemetry</Text>
              {moistureData && (
                <View style={[
                  styles.moistureBadge,
                  { backgroundColor: moistureData.needsWatering ? '#7f1d1d' : '#064e3b' }
                ]}>
                  <Text style={[
                    styles.moistureBadgeText,
                    { color: moistureData.needsWatering ? '#f87171' : '#34d399' }
                  ]}>
                    {moistureData.needsWatering ? '⚠️ WATERING NEEDED' : '✅ NO WATER NEEDED'}
                  </Text>
                </View>
              )}
            </View>

            {moistureLoading ? (
              <View style={styles.moistureGaugeContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.samplingStatusText}>{samplingText}</Text>
              </View>
            ) : moistureData ? (
              <View style={styles.moistureGaugeContainer}>
                <Text style={styles.moisturePercentText}>{moistureData.percentage}%</Text>
                <Text style={styles.moistureSubtext}>
                  {moistureData.needsWatering 
                    ? 'Soil is dry (under 35%). Field requires watering.' 
                    : 'Soil moisture is optimal. Plot does not need watering.'}
                </Text>
              </View>
            ) : (
              <Text style={styles.moisturePlaceholderText}>Tap the button below to sample soil moisture for 3 seconds.</Text>
            )}

            <TouchableOpacity
              style={[styles.moistureBtn, { backgroundColor: !connectedIp ? '#333' : '#10B981' }]}
              onPress={measureSoilMoisture}
              disabled={!connectedIp || moistureLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {moistureLoading ? 'Sampling...' : '🧪 Check Soil Moisture'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scan Result Modal */}
        <Modal
          visible={scanResult !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setScanResult(null)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeader}>🔬 Diagnosis Result</Text>
              
              {scanResult && (
                <View style={styles.modalContent}>
                  <Image
                    source={{ uri: `${API_BASE_URL}/${scanResult.image_url}` }}
                    style={styles.modalImage}
                  />
                  <Text style={styles.modalDisease}>{scanResult.disease}</Text>
                  <Text style={styles.modalConfidence}>
                    Confidence Score: <Text style={styles.modalConfidenceVal}>{formatConfidence(scanResult.confidence)}%</Text>
                  </Text>
                  
                  {scanResult.recommendation ? (
                    <View style={styles.modalRecBox}>
                      <Text style={styles.modalRecTitle}>💡 Recommendation:</Text>
                      <Text style={styles.modalRecText}>{scanResult.recommendation}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setScanResult(null)}
              >
                <Text style={styles.modalCloseBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    letterSpacing: 1,
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  ipInput: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  connectBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  connectBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  dropdownToggle: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    marginHorizontal: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  dropdownItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownConnectedBadge: {
    fontSize: 11,
    color: '#2ecc71',
  },
  dropdownDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownDeleteText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  cameraContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  camera: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cameraPlaceholderText: {
    color: '#444',
    fontSize: 13,
  },
  controls: {
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  btnGreen: {
    backgroundColor: '#2e7d32',
  },
  btnRed: {
    backgroundColor: '#c62828',
  },
  actionBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  patrolBtn: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patrolStatus: {
    color: '#8e44ad',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#eee',
    marginBottom: 16,
  },
  modalDisease: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalConfidence: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  modalConfidenceVal: {
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  modalRecBox: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  modalRecTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  modalRecText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: '#2ecc71',
    width: '100%',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  moistureCard: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  moistureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moistureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f1f1f1',
  },
  moistureBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moistureBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  moistureGaugeContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  moisturePercentText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#34d399',
  },
  moistureSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  samplingStatusText: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 10,
    fontWeight: '600',
  },
  moisturePlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 14,
  },
  moistureBtn: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
