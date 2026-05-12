import os
import re

def replace_in_file(filepath):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 1. Remove dotted/dashed
        content = content.replace("dotted", "solid")
        content = content.replace("dashed", "solid")
        
        # 2. Make borders 5px thick
        # Match "1px solid", "1.1px solid", "2px solid", "1.5 solid", "1.2px solid" etc
        content = re.sub(r'(\d+(\.\d+)?px\s+solid)', '5px solid', content)
        content = re.sub(r'(border:\s+solid)', 'border: 5px solid', content)
        
        # Ensure var(--border) is used if possible, or just force 5px
        # If someone has "border: 1px solid var(--border)" -> "border: 5px solid var(--border)"
        content = re.sub(r'(border:\s+)(\d+(\.\d+)?px)(\s+solid)', r'\1 5px \4', content)
        content = re.sub(r'(border-right:\s+)(\d+(\.\d+)?px)(\s+solid)', r'\1 5px \4', content)
        content = re.sub(r'(border-left:\s+)(\d+(\.\d+)?px)(\s+solid)', r'\1 5px \4', content)
        content = re.sub(r'(border-top:\s+)(\d+(\.\d+)?px)(\s+solid)', r'\1 5px \4', content)
        content = re.sub(r'(border-bottom:\s+)(\d+(\.\d+)?px)(\s+solid)', r'\1 5px \4', content)

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
