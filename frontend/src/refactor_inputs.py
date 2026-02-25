import os
import re

def rewrite_inputs_buttons(content):
    # 1. Buttons -> Pills globally
    # Catch typical button structures. 
    # We already converted rounded-lg to rounded-2xl in phase 1, but buttons need `rounded-full` ideally.
    content = content.replace('px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-2xl', 'px-6 py-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-full shadow-sm shadow-primary/20')
    content = content.replace('px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-[32px]', 'px-6 py-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-full shadow-sm shadow-primary/20')
    
    # Generic action buttons
    content = content.replace('px-4 py-2 rounded-2xl bg-surf-mutedLight dark:bg-surf-mutedDark hover:bg-slate-200 dark:hover:bg-slate-700 w-full font-medium transition-colors', 'px-6 py-3 rounded-full bg-surf-mutedLight dark:bg-surf-mutedDark hover:bg-slate-200 dark:hover:bg-surf-borderDark w-full font-semibold transition-colors')

    # 2. Forms/Inputs -> Soft floating blocks
    # Focus rings and basic structure
    content = content.replace(
        'w-full bg-transparent border border-surf-borderLight dark:border-surf-borderDark rounded-2xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white',
        'w-full bg-surf-mutedLight dark:bg-surf-mutedDark border-none rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-medium placeholder-slate-400'
    )
    
    # Generic specific replacement
    content = content.replace(
        'bg-transparent border border-surf-borderLight dark:border-surf-borderDark rounded-2xl px-4 py-2 outline-none focus:border-primary',
        'bg-surf-mutedLight dark:bg-surf-mutedDark border-none rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/50 font-medium'
    )

    return content

base_dir = r"c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components"

for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith((".ts", ".html")):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = rewrite_inputs_buttons(content)

            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

print(f"Inputs and buttons rounded.")
