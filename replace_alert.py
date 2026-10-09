import os
filepath = r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\rover.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("alert('Failed to scan image. Ensure the Rover is reachable on WiFi.');", "alert('Failed to scan image. Error: ' + error.message);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated')
