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

# SWAP MAP: White <-> Blue
replacements = [
    ("#ffffff", "TEMP_WHITE"),
    ("#fff", "TEMP_WHITE"),
    ("#102a96", "#ffffff"), # Blue to White
    ("TEMP_WHITE", "#102a96"), # White to Blue
    
    ("rgba(255, 255, 255, 0.8)", "TEMP_RGBA_W"),
    ("rgba(16, 42, 150, 0.4)", "rgba(255, 255, 255, 0.4)"), # Blue Border to White Border
    ("TEMP_RGBA_W", "rgba(16, 42, 150, 0.4)"), # White Background to Blue
    
    ("background: rgba(255, 255, 255, 0.8)", "background: rgba(16, 42, 150, 0.8)"),
    ("background: #ffffff", "background: #102a96"),
    ("color: #1a1a2e", "color: #ffffff"),
]

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path, replacements)

print("Done.")
