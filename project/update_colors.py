import os

def replace_in_file(filepath, old_str, new_str):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if old_str in content:
            new_content = content.replace(old_str, new_str)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error updating {filepath}: {e}")

root_dir = r'c:\Users\asus\OneDrive\Desktop\cohort\project\frontend'

# Primary Blue replacement
old_rgb = "108, 99, 255"
new_rgb = "16, 42, 150"

# Hex replacements if any left
old_hex = "#6c63ff"
new_hex = "#102a96"

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, file)
            replace_in_file(path, old_rgb, new_rgb)
            replace_in_file(path, old_hex, new_hex)
            # Also handle variations like spacing
            replace_in_file(path, "108,99,255", "16,42,150")

print("Done.")
