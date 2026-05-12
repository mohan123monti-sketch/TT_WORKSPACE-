import os
import re

def replace_in_file(filepath):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace "5px solid" or "5px  solid" etc with "2px solid"
        content = re.sub(r'5\s*px\s*solid', '2px solid', content)
        # Handle cases like "border: 5px solid var(--border)"
        content = re.sub(r'(\s+)5px(\s+solid)', r'\1 2px \2', content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error updating {filepath}: {e}")

root_dir = r'c:\Users\asus\OneDrive\Desktop\cohort\project\frontend\public'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path)

print("Done.")
