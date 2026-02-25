import os
import re

def convert_global(content):
    content = content.replace('bg-gradient-to-r from-gray-900 to-black', 'bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:shadow-none dark:bg-none')
    content = content.replace('bg-gradient-to-r from-transparent via-primary to-transparent opacity-50', 'bg-gradient-to-r from-transparent via-primary/20 dark:via-primary to-transparent opacity-50')
    content = content.replace('text-white', 'text-slate-800 dark:text-slate-100')
    content = content.replace('text-white/60', 'text-slate-500 dark:text-slate-400')
    content = content.replace('text-white/40', 'text-slate-400 dark:text-slate-500')
    content = content.replace('text-white/50', 'text-slate-500 dark:text-slate-400')
    content = content.replace('text-white/80', 'text-slate-700 dark:text-slate-300')
    content = content.replace('border-white/10', 'border-slate-200 dark:border-slate-700')
    content = content.replace('border-white/5', 'border-slate-100 dark:border-slate-700/50')
    
    # Backgrounds
    content = content.replace('bg-black/20', 'bg-slate-100 dark:bg-slate-900/50')
    content = content.replace('bg-black/30', 'bg-white dark:bg-slate-900')
    content = content.replace('bg-black/40', 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white')
    content = content.replace('bg-black/50', 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white')
    content = content.replace('bg-black/80', 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100')
    content = content.replace('bg-black/90', 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100')
    
    content = content.replace('bg-white/5', 'bg-slate-50 dark:bg-slate-800/50')
    content = content.replace('bg-white/10', 'bg-slate-100 dark:bg-slate-800')
    content = content.replace('hover:bg-white/10', 'hover:bg-slate-100 dark:hover:bg-slate-700/50')
    content = content.replace('hover:bg-white/5', 'hover:bg-slate-50 dark:hover:bg-slate-800/50')

    # General replacements (only replacing standalone classes to avoid messing up specific dark: variants)
    content = content.replace('text-gray-400 hover:text-white', 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
    content = content.replace('text-gray-400', 'text-slate-500 dark:text-slate-400')
    content = content.replace('text-gray-500', 'text-slate-600 dark:text-slate-400')
    content = content.replace('text-gray-300', 'text-slate-700 dark:text-slate-300')
    content = content.replace('text-gray-600', 'text-slate-500 dark:text-slate-500')

    content = content.replace('bg-gray-900', 'bg-slate-50 dark:bg-slate-900')
    content = content.replace('bg-gray-800', 'bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:shadow-none')
    content = content.replace('bg-gray-700', 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600')

    # Greens / Reds
    content = content.replace('text-green-400', 'text-emerald-600 dark:text-emerald-400')
    content = content.replace('text-green-500', 'text-emerald-600 dark:text-emerald-400')
    content = content.replace('text-red-400', 'text-rose-600 dark:text-rose-400')
    content = content.replace('text-red-500', 'text-rose-600 dark:text-rose-400')

    return content

base_dir = r"c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components"
targets = ["layout"]

for t in targets:
    t_dir = os.path.join(base_dir, t)
    if os.path.exists(t_dir):
        for root, _, files in os.walk(t_dir):
            for file in files:
                if file.endswith((".ts", ".html")):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Specific replacements for cards
                    content = re.sub(
                        r'class="(.*?)glass-card(.*?)"',
                        r'class="\1bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:shadow-lg rounded-2xl\2"',
                        content
                    )
                    
                    content = convert_global(content)

                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)

print(f"Processed layout targets")
