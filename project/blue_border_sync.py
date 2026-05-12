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
    ("opacity: 0.3", "opacity: 1.0"), # Make dividers solid
    ("rgba(16, 42, 150, 0.1)", "rgba(16, 42, 150, 0.4)"), # Darker blue borders
    ("rgba(0, 0, 0, 0.1)", "rgba(16, 42, 150, 0.4)"), # Replace dark dividers with blue
    ("border-bottom: 1px solid rgba(255, 255, 255, 0.1)", "border-bottom: 1px solid rgba(16, 42, 150, 0.4)"),
]

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path, replacements)

print("Done.")
