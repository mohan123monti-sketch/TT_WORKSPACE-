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
    ("background: rgba(0, 0, 0, 0.8)", "background: rgba(255, 255, 255, 0.8)"),
    ("background: rgba(0, 0, 0, 0.6)", "background: rgba(255, 255, 255, 0.6)"),
    ("background: rgba(8, 8, 16, 0.8)", "background: rgba(255, 255, 255, 0.8)"),
    ("background: rgba(0, 0, 0, 0.1)", "background: rgba(16, 42, 150, 0.05)"),
    ("background: var(--bg-secondary)", "background: var(--bg-primary)"), # Force white sidebar
    ("background: #111122", "background: #ffffff"),
    ("background: #080810", "background: #ffffff"),
    ("background-color: #1a1a24", "background-color: #ffffff"),
    ("color: #ffffff", "color: #1a1a2e"),
    ("color: #fff", "color: #1a1a2e"),
]

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path, replacements)

print("Done.")
