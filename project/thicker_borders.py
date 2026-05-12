import os

def replace_in_file(filepath, replacements):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        modified = False
        for old, new in replacements:
            if old in content:
                content = content.replace(old, new)
                modified = True
        
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error updating {filepath}: {e}")

root_dir = r'c:\Users\asus\OneDrive\Desktop\cohort\project\frontend\public'

replacements = [
    ("1.5px solid", "2px solid"),
    ("1px solid", "2px solid"),
    ("border-top: 1px solid", "border-top: 2px solid"),
    ("border-bottom: 1px solid", "border-bottom: 2px solid"),
    ("border-right: 1px solid", "border-right: 2px solid"),
    ("border-left: 1px solid", "border-left: 2px solid"),
    ("border: 1px dashed", "border: 2px dashed"),
]

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path, replacements)

print("Done.")
