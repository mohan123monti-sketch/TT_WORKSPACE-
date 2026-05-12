import os
import re

def clean_html(filepath):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace onclick="window.location.href='...'" with href="..." in specialized tags or just remove it
        # Actually, let's convert them to data-href to be safe or just standard <a> tags if possible
        # But since they are <div> blocks, we'll use data-href and tell sidebar.js to look for it
        
        modified = False
        
        # 1. Convert onclick to data-href
        # Match: onclick="window.location.href='dashboard.html'"
        # Match: onclick='window.location.href="dashboard.html"'
        pattern = r'onclick=["\']window\.location\.href\s*=\s*[\'"](.*?)[\'"][\"\']'
        
        if re.search(pattern, content):
            content = re.sub(pattern, r'data-nav="\1"', content)
            modified = True
        
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Cleaned Navigation in: {filepath}")
    except Exception as e:
        print(f"Error cleaning {filepath}: {e}")

root_dir = r'c:\Users\asus\OneDrive\Desktop\cohort\project\frontend\public'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.html'):
            clean_html(os.path.join(root, file))

print("Done.")
