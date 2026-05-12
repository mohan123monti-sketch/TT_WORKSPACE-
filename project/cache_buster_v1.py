import os
import re
import time

timestamp = int(time.time())

def cache_bust(filepath):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Match <link href="...css"> and <script src="...js">
        # Avoid already versioned ones
        
        # 1. CSS
        content = re.sub(r'href="([^"]+?\.css)(\?v=\d+)?"', f'href="\\1?v={timestamp}"', content)
        # 2. JS
        content = re.sub(r'src="([^"]+?\.js)(\?v=\d+)?"', f'src="\\1?v={timestamp}"', content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Busted Cache in: {filepath}")
    except Exception as e:
        print(f"Error busting cache in {filepath}: {e}")

root_dir = r'c:\Users\asus\OneDrive\Desktop\cohort\project\frontend\public'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.html'):
            cache_bust(os.path.join(root, file))

print(f"Cache Busting Done. Version: {timestamp}")
