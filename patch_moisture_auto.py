import re

filepath = r"C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\rover.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        if (data.status === 'success') {
          const percentage = Number(data.moisture);
          const rawAdc = Number(data.raw);
          const needsWatering = percentage < 35; // Under 35% means field needs irrigation
          setMoistureData({ percentage, level: data.level, needsWatering });

          // Sync reading with backend database so Home screen gets updated
          try {
            await fetch(`${API_BASE_URL}/save_moisture.php?field_id=1&moisture=${percentage}`);
          } catch (err) {
            console.error('Failed to sync moisture to backend', err);
          }"""

new_logic = """        if (data.status === 'success') {
          const percentage = Number(data.moisture);
          const rawAdc = Number(data.raw);
          const temp = data.temperature !== undefined ? Number(data.temperature) : null;
          const needsWatering = percentage < 35; // Under 35% means field needs irrigation
          
          setMoistureData({ percentage, level: data.level, needsWatering });

          // Sync reading with backend database so Home screen gets updated
          try {
            let url = `${API_BASE_URL}/save_moisture.php?field_id=1&moisture=${percentage}`;
            if (temp !== null && !isNaN(temp)) {
              url += `&temperature=${temp}`;
            }
            await fetch(url);
          } catch (err) {
            console.error('Failed to sync moisture to backend', err);
          }

          // Automatically trigger watering system if moisture is low
          if (needsWatering) {
            try {
              const WATER_SYSTEM_IP = 'http://192.168.100.225';
              const waterRes = await fetch(`${WATER_SYSTEM_IP}/water_on`);
              if (waterRes.ok) {
                Alert.alert('Auto-Watering Activated', `Soil moisture is extremely low (${percentage}%).\n\nThe watering system has been automatically started.`);
              } else {
                Alert.alert('Auto-Watering Failed', `Soil moisture is low (${percentage}%), but the watering system returned an error.`);
              }
            } catch (err) {
              Alert.alert('Auto-Watering Failed', `Soil moisture is low (${percentage}%), but could not connect to watering system at 192.168.100.225.`);
            }
          }"""

if "const temp = data.temperature" not in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched measureSoilMoisture logic")
else:
    print("Already patched")
