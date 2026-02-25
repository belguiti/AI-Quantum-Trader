import os
import re

def convert_foundation(content):
    # Overhaul radii unconditionally
    content = content.replace('rounded-lg', 'rounded-2xl')
    content = content.replace('rounded-xl', 'rounded-3xl')
    content = content.replace('rounded-2xl', 'rounded-[32px]') # Heavy cards
    content = content.replace('rounded-3xl', 'rounded-[32px]') # Heavy cards

    # For strict pills (buttons generally use these explicitly now, will target later if needed, 
    # but let's change typical small/med radii slightly if used in smaller badges)
    content = content.replace('rounded-md', 'rounded-xl')
    
    # Strip basic shadows completely to flatten the UI
    content = content.replace('shadow-sm', '')
    content = content.replace('shadow-md', '')
    content = content.replace('shadow-lg', '')
    content = content.replace('shadow-xl', '')
    content = content.replace('shadow-2xl', '')
    
    # Strip borders globally if they were used for structure and replace with elevated colors (already done largely by the previous surf change)
    return content

base_dir = r"c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components"

for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith((".ts", ".html")):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = convert_foundation(content)
            
            # Clean up extra spaces left by shadow removals
            new_content = re.sub(r'\s+', ' ', new_content)
            new_content = new_content.replace(' class=" "', '')
            
            # Additional cleanup for class attributes that might be malformed after space removal
            new_content = new_content.replace('class=" ', 'class="')
            new_content = new_content.replace(' "', '"')
            new_content = new_content.replace('" >', '">')

            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

print(f"Processed foundation radius and shadow stripping.")
