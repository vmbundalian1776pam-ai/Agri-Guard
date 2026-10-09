import os

filepath = r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove state
content = content.replace(
    "const [waterLoading, setWaterLoading] = useState(false);\n  const [wateringIp, setWateringIp] = useState('172.20.10.X');",
    "const [waterLoading, setWaterLoading] = useState(false);"
)

# 2. Remove AsyncStorage load
content = content.replace(
    "fetchFieldStatus();\n      AsyncStorage.getItem('wateringIp').then(ip => { if (ip) setWateringIp(ip); });\n    }, [])",
    "fetchFieldStatus();\n    }, [])"
)

# 3. Remove save fn and IP check
save_fn_and_toggle = """  const saveWateringIp = async (ip: string) => {
    setWateringIp(ip);
    await AsyncStorage.setItem('wateringIp', ip);
  };

  const toggleWatering = async () => {
    if (!wateringIp || wateringIp.includes('X')) { alert('Please set Watering ESP32 IP first.'); return; }"""

new_toggle = """  const WATER_SYSTEM_IP = 'http://172.20.10.6';

  const toggleWatering = async () => {"""

content = content.replace(save_fn_and_toggle, new_toggle)

# 4. Fix fetch
content = content.replace(
    "fetch(`http://${wateringIp}${endpoint}`",
    "fetch(`${WATER_SYSTEM_IP}${endpoint}`"
)

# 5. Remove UI
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

old_ui = """            <View style={styles.waterStatusBadge}>
              <Text style={styles.waterStatusText}>{isWatering ? 'RUNNING' : 'STANDBY'}</Text>
            </View>
          </View>"""

content = content.replace(ui_insert, old_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Reverted text box and set hardcoded IP to 172.20.10.6')
