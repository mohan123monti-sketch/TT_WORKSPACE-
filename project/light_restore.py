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

# Final Professional Light Restore
replacements = [
    ("background: #102a96", "background: var(--bg-primary)"),
    ("background: var(--bg-primary)", "background: #ffffff"),
    ("background: var(--bg-secondary)", "background: #f8fafc"),
    ("color: #ffffff", "color: var(--text-primary)"),
    ("color: #102a96", "color: var(--text-primary)"),
    ("rgba(255, 255, 255, 0.4)", "rgba(16, 42, 150, 0.1)"),
    ("2px solid", "1px solid"), # Back to thin professional borders
    ("1.2px solid", "1px solid"),
    ("rgba(16, 42, 150, 0.6)", "rgba(0, 0, 0, 0.4)"), # Modal shadow
]

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path, replacements)

print("Done.")
