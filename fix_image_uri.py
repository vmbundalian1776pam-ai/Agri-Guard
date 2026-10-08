with open(r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('getImageUri = (path: string)')
if idx == -1:
    print('Function not found')
else:
    # Find the end of the function
    end = content.find('};', idx) + 2
    old_func = content[idx:end]
    print('Found function:')
    print(repr(old_func))
    
    new_func = """getImageUri = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:')) return path;   // base64 inline - use as-is
    if (path.startsWith('http')) return path;    // absolute URL
    return `${API_BASE_URL}/${path}`;
  };"""
    
    content = content.replace(old_func, new_func)
    with open(r'C:\Users\user\Documents\Xampp\htdocs\Agri-Guard\agri-guard-app\app\(tabs)\index.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed!')
