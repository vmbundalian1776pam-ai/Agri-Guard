import os
import re

filepath = r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
content = content.replace(
    "const [waterLoading, setWaterLoading] = useState(false);",
    "const [waterLoading, setWaterLoading] = useState(false);\n  const [wateringIp, setWateringIp] = useState('172.20.10.X');"
)

# 2. AsyncStorage load
content = content.replace(
    "fetchFieldStatus();\n    }, [])",
    "fetchFieldStatus();\n      AsyncStorage.getItem('wateringIp').then(ip => { if (ip) setWateringIp(ip); });\n    }, [])"
)

# 3. Save function
save_fn = """  const saveWateringIp = async (ip: string) => {
    setWateringIp(ip);
    await AsyncStorage.setItem('wateringIp', ip);
  };"""
content = content.replace("const toggleWatering = async () => {", save_fn + "\n\n  const toggleWatering = async () => {\n    if (!wateringIp || wateringIp.includes('X')) { alert('Please set Watering ESP32 IP first.'); return; }")

# 4. Remove old hardcoded IP
content = content.replace("const WATER_SYSTEM_IP = 'http://192.168.100.225';", "")

# 5. Fix fetch URL
content = content.replace(
    "fetch(`${WATER_SYSTEM_IP}${endpoint}`",
    "fetch(`http://${wateringIp}${endpoint}`"
)

# 6. Add UI input
ui_insert = """            <View style={styles.waterStatusBadge}>
              <Text style={styles.waterStatusText}>{isWatering ? 'RUNNING' : 'STANDBY'}</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', padding: 8, borderRadius: 8, marginTop: 10, marginBottom: 10}}>
            <Text style={{color: '#aaa', marginRight: 10, fontSize: 12}}>Watering System IP:</Text>
            <TextInput
              style={{color: '#fff', flex: 1, padding: 0, fontSize: 12}}
              value={wateringIp}
              onChangeText={setWateringIp}
              onBlur={() => saveWateringIp(wateringIp)}
              placeholder="e.g. 172.20.10.X"
              placeholderTextColor="#666"
            />
          </View>"""
content = content.replace(
    "            <View style={styles.waterStatusBadge}>\n              <Text style={styles.waterStatusText}>{isWatering ? 'RUNNING' : 'STANDBY'}</Text>\n            </View>\n          </View>",
    ui_insert
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.tsx with Watering IP input")
