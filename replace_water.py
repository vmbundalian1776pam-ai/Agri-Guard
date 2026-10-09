import os
filepath = r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_water = """  const toggleWatering = async () => {
    setWaterLoading(true);
    try {
      const endpoint = isWatering ? '/water_off' : '/water_on';
      const response = await fetch(`${WATER_SYSTEM_IP}${endpoint}`);"""

new_water = """  const toggleWatering = async () => {
    setWaterLoading(true);
    try {
      const endpoint = isWatering ? '/water_off' : '/water_on';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${WATER_SYSTEM_IP}${endpoint}`, { signal: controller.signal });
      clearTimeout(timeoutId);"""

content = content.replace(old_water, new_water)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated')
