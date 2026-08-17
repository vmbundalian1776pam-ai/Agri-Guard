import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '../../config';

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
  const [isScanMode, setIsScanMode] = useState(false); // pauses stream so ESP32 is free for capture
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<TextInput>(null);

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
    if (roverIp.trim()) {
      setConnectedIp(roverIp.trim());
    }
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
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
            <Text style={styles.connectBtnText}>Connect</Text>
          </TouchableOpacity>
        </View>

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
              disabled={!connectedIp || isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
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
});
