import os
filepath = r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\rover.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_moisture = """      const response = await fetch(`http://${connectedIp}/read_moisture`);"""
new_moisture = """      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(`http://${connectedIp}/read_moisture`, { signal: controller.signal });
      clearTimeout(timeoutId);"""

content = content.replace(old_moisture, new_moisture)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated')
