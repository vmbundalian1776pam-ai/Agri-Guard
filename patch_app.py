import os

path = r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\backend\ai_server\app.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "if __name__ == '__main__':\n    init_db()\n    load_ai_assets()"
new_str = """# Initialize DB and model on module load for Gunicorn
try:
    init_db()
    load_ai_assets()
except Exception as e:
    print('Startup error:', e)

if __name__ == '__main__':"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed module level init")
else:
    print("Could not find the string to replace")
