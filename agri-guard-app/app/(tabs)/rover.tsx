import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
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
  </style>
</head>
<body>
  <img id="s" src="http://${ip}:81/stream" onerror="setTimeout(() => { this.src='http://${ip}:81/stream?'+Date.now() }, 3000);" />
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

  // Patrol Settings State
  const [showPatrolSettings, setShowPatrolSettings] = useState(false);
  const [patrolCycles, setPatrolCycles] = useState<number | 'unlimited'>(3);
  const [patrolScanCrop, setPatrolScanCrop] = useState(true);
  const [patrolSoilTest, setPatrolSoilTest] = useState(false);

  // Soil Moisture State
  const [moistureData, setMoistureData] = useState<{ percentage: number; level: string; needsWatering: boolean } | null>(null);
  const [moistureLoading, setMoistureLoading] = useState(false);

  const measureSoilMoisture = async () => {
    if (!connectedIp) {
      Alert.alert('Not Connected', 'Please connect to a Rover IP first.');
      return;
    }
    setMoistureLoading(true);

    try {
      // 2.5 second sampling duration for realistic sensor reading
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const response = await fetch(`http://${connectedIp}/read_moisture`);
      const data = await response.json();
      if (data.status === 'success') {
        const percentage = Number(data.moisture);
        const rawAdc = Number(data.raw);
        const needsWatering = percentage < 35; // Under 35% means field needs irrigation
        setMoistureData({ percentage, level: data.level, needsWatering });

        // Sync reading with backend database so Home screen gets updated
        try {
          await fetch(`${API_BASE_URL}/save_moisture.php?field_id=1&moisture=${percentage}`);
        } catch (err) {
          console.error('Failed to sync moisture to backend', err);
        }

        // Auto Watering Trigger
        if (needsWatering) {
          try {
            const WATER_SYSTEM_IP = 'http://192.168.100.225';
            const waterRes = await fetch(`${WATER_SYSTEM_IP}/water_on`);
            if (waterRes.ok) {
              Alert.alert(
                '🌱 Auto-Watering Activated', 
                `Soil moisture is extremely low (${percentage}%).\n\nThe watering system has been automatically started and will run for 10 seconds.`
              );
              
              // 10 second auto shut-off
              setTimeout(async () => {
                try {
                  await fetch(`${WATER_SYSTEM_IP}/water_off`);
                  console.log("Watering system auto-stopped after 10 seconds.");
                } catch (e) {
                  console.error("Failed to turn off water", e);
                }
              }, 10000);

            } else {
              Alert.alert('⚠️ Auto-Watering Failed', `Soil moisture is low (${percentage}%), but the watering system returned an error.`);
            }
          } catch (err) {
            Alert.alert('⚠️ Auto-Watering Failed', `Soil moisture is low (${percentage}%), but could not connect to watering system at 192.168.100.225.`);
          }
        } else {
          // Display normal test result popup if no watering is needed
          Alert.alert(
            '🌱 Soil Moisture Test Result',
            `Moisture Level: ${percentage}%\nRaw ADC: ${rawAdc}\nStatus: ✅ SOIL MOIST\n\nSoil moisture is optimal. Irrigation is not required.`
          );
        }
      } else {
        Alert.alert('Error', 'Could not read soil moisture data from Rover.');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Failed to reach Rover moisture sensor. Ensure sensor is wired to pin IO2.');
    } finally {
      setMoistureLoading(false);
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
      // Safely append cache-buster depending on if action already has a query string
      const separator = action.includes('?') ? '&' : '?';
      const url = `http://${connectedIp}/${action}${separator}_=${Date.now()}`;
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
      // 1. Phone captures image directly from Rover on the local network
      const captureUrl = `http://${connectedIp}/capture`;
      const imageResponse = await fetch(captureUrl);
      if (!imageResponse.ok) throw new Error('Rover /capture failed');
      
      const blob = await imageResponse.blob();
      
      // 2. Phone uploads that image to InfinityFree in the cloud
      const formData = new FormData();
      formData.append('field_id', '1');
      // @ts-ignore - React Native FormData accepts blobs
      formData.append('image', blob, 'capture.jpg');
      
      const uploadResponse = await fetch(`${API_BASE_URL}/upload_image.php`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await uploadResponse.json();
      if (result.status === 'success') {
        setScanResult(result.data);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to scan image. Ensure the Rover is reachable on WiFi.');
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
    setShowPatrolSettings(false);
    patrolActiveRef.current = true;
    setIsPatrolling(true);

    let cycle = 0;
    const maxCycles = patrolCycles === 'unlimited' ? Infinity : patrolCycles;

    while (patrolActiveRef.current && cycle < maxCycles) {
      cycle++;

      // Step 1: Drive forward
      setPatrolStep(`Cycle ${cycle}${patrolCycles !== 'unlimited' ? `/${patrolCycles}` : ''}: Moving forward...`);
      sendCommand('go');
      await new Promise(r => setTimeout(r, 3000));
      if (!patrolActiveRef.current) break;

      // Step 2: Stop
      sendCommand('stop');
      setPatrolStep(`Cycle ${cycle}: Stopped — preparing sensors...`);
      await new Promise(r => setTimeout(r, 1000));
      if (!patrolActiveRef.current) break;

      // Step 3 (Optional): Scan crop
      if (patrolScanCrop) {
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
          const captureUrl = `http://${connectedIp}/capture`;
          const imageResponse = await fetch(captureUrl);
          if (!imageResponse.ok) throw new Error('Rover /capture failed');
          
          const blob = await imageResponse.blob();
          
          const formData = new FormData();
          formData.append('field_id', '1');
          // @ts-ignore
          formData.append('image', blob, 'capture.jpg');
          
          const uploadResponse = await fetch(`${API_BASE_URL}/upload_image.php`, {
            method: 'POST',
            body: formData,
          });
          
          const result = await uploadResponse.json();
          if (result.status === 'success') {
            setScanResult(result.data);
          }
        } catch (error) {
          console.error('Patrol scan failed:', error);
        } finally {
          setIsScanning(false);
          setIsScanMode(false);
        }

        await new Promise(r => setTimeout(r, 1000));
        if (!patrolActiveRef.current) break;
      }

      // Step 4 (Optional): Test soil moisture
      if (patrolSoilTest) {
        setPatrolStep(`Cycle ${cycle}: Testing soil moisture...`);
        setMoistureLoading(true);
        try {
          const response = await fetch(`http://${connectedIp}/read_moisture`);
          const data = await response.json();
          if (data.status === 'success') {
            const percentage = Number(data.moisture);
            setMoistureData({ percentage, level: data.level, needsWatering: percentage < 35 });
            try {
              await fetch(`${API_BASE_URL}/save_moisture.php?field_id=1&moisture=${percentage}`);
            } catch (err) {}
          }
        } catch (e) {
          console.error('Patrol moisture test failed:', e);
        } finally {
          setMoistureLoading(false);
        }

        await new Promise(r => setTimeout(r, 1000));
        if (!patrolActiveRef.current) break;
      }

      // Brief pause before next cycle
      await new Promise(r => setTimeout(r, 500));
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
        <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={true}>
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
                source={{ html: getStreamHtml(connectedIp), baseUrl: `http://${connectedIp}` }}
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
              onPress={() => sendCommand('stop')}
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
              onPress={() => sendCommand('stop')}
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
              onPress={() => sendCommand('stop')}
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
              onPress={() => sendCommand('stop')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.down" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Camera Tilt Controls */}
          <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#34495e', flex: 1 }]}
              onPress={() => sendCommand('tilt?angle=80')}
              disabled={!connectedIp}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>📐 Tilt UP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#34495e', flex: 1 }]}
              onPress={() => sendCommand('tilt?angle=120')}
              disabled={!connectedIp}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>📐 Tilt DOWN</Text>
            </TouchableOpacity>
          </View>

          {/* Scan & Light Controls */}
          <View style={[styles.row, { marginTop: 10, gap: 14 }]}>
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

          {/* Row 2: Auto Patrol & Test Soil Moisture */}
          <View style={[styles.row, { marginTop: 10, gap: 14 }]}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: !connectedIp ? '#333' : isPatrolling ? '#e74c3c' : '#8e44ad' }
              ]}
              onPress={isPatrolling ? stopPatrol : () => setShowPatrolSettings(true)}
              disabled={!connectedIp || isScanning || moistureLoading}
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

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: !connectedIp ? '#333' : moistureLoading ? '#d97706' : '#10B981' }
              ]}
              onPress={measureSoilMoisture}
              disabled={!connectedIp || isScanning || isPatrolling || moistureLoading}
              activeOpacity={0.8}
            >
              {moistureLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>🧪 Test Soil Moisture</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Patrol Status */}
          {isPatrolling && patrolStep ? (
            <Text style={styles.patrolStatus}>{patrolStep}</Text>
          ) : null}
        </View>
        </ScrollView>

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
                    source={{ uri: scanResult.image_url.startsWith('http') ? scanResult.image_url : `${API_BASE_URL}/${scanResult.image_url}` }}
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

        {/* Patrol Settings Modal */}
        <Modal
          visible={showPatrolSettings}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPatrolSettings(false)}
        >
          <View style={styles.modalBackground}>
            <View style={[styles.modalContainer, { paddingBottom: 24 }]}>
              <Text style={styles.modalHeader}>🤖 Auto Patrol Settings</Text>
              <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 18 }}>
                Configure what the rover does during each patrol cycle.
              </Text>

              {/* Cycles selector */}
              <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>How many cycles?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {([1, 3, 5, 10, 'unlimited'] as const).map(val => (
                  <TouchableOpacity
                    key={String(val)}
                    onPress={() => setPatrolCycles(val)}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: patrolCycles === val ? '#8e44ad' : '#2a2a2a',
                      borderWidth: 1,
                      borderColor: patrolCycles === val ? '#8e44ad' : '#444',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>
                      {val === 'unlimited' ? '♾ Unlimited' : `${val}x`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Scan crop toggle */}
              <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>Include at each stop:</Text>
              <TouchableOpacity
                onPress={() => setPatrolScanCrop(v => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 10, marginBottom: 10,
                  backgroundColor: patrolScanCrop ? '#1a3a2a' : '#1e1e1e',
                  borderWidth: 1, borderColor: patrolScanCrop ? '#27ae60' : '#333',
                }}
              >
                <Text style={{ fontSize: 22 }}>{patrolScanCrop ? '✅' : '⬜'}</Text>
                <View>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>🌿 Scan Crop</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>AI disease detection at each stop</Text>
                </View>
              </TouchableOpacity>

              {/* Soil test toggle */}
              <TouchableOpacity
                onPress={() => setPatrolSoilTest(v => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 10, marginBottom: 24,
                  backgroundColor: patrolSoilTest ? '#1a2a3a' : '#1e1e1e',
                  borderWidth: 1, borderColor: patrolSoilTest ? '#3498db' : '#333',
                }}
              >
                <Text style={{ fontSize: 22 }}>{patrolSoilTest ? '✅' : '⬜'}</Text>
                <View>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>💧 Test Soil Moisture</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>Probe soil at each stop</Text>
                </View>
              </TouchableOpacity>

              {/* Start / Cancel */}
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: '#8e44ad', marginBottom: 10 }]}
                onPress={startPatrol}
              >
                <Text style={styles.modalCloseBtnText}>🚀 Start Patrol</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: '#333' }]}
                onPress={() => setShowPatrolSettings(false)}
              >
                <Text style={styles.modalCloseBtnText}>Cancel</Text>
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
