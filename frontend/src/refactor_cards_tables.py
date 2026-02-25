import os
import re

def rewrite_cards_and_tables(content):
    # 1. Dashboard Cards
    # Change any remaining generic bg-white with heavy borders to just a clean surf card
    content = content.replace(
        'bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700',
        'bg-surf-cardLight dark:bg-surf-cardDark border outline-none ring-0 border-surf-borderLight dark:border-surf-borderDark'
    )
    # Ensure massive padding if standard padding was used
    content = content.replace('p-4', 'p-6 sm:p-8')
    content = content.replace('p-5', 'p-8 sm:p-10')

    # 2. Table to List style conversion
    # Remove standard borders between rows
    content = content.replace('border-b border-slate-100 dark:border-slate-700/50', 'border-b border-transparent hover:bg-surf-mutedLight dark:hover:bg-surf-mutedDark transition-colors rounded-2xl')
    content = content.replace('divide-y divide-slate-100 dark:divide-slate-700/50', 'space-y-2') # turn table rows into spaced out list items
    
    # Text headers in tables - tiny, bold, uppercase
    content = content.replace('text-xs font-semibold text-slate-500 uppercase tracking-wider', 'text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest')

    return content

base_dir = r"c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components"
targets = ["dashboard", "dashboard-view", "lab", "active-strategies", "swing-signals", "ai-signals", "ai-status-widget", "macro-data"]

for t in targets:
    t_dir = os.path.join(base_dir, t)
    if os.path.exists(t_dir):
        for root, _, files in os.walk(t_dir):
            for file in files:
                if file.endswith((".ts", ".html")):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    new_content = rewrite_cards_and_tables(content)

                    if new_content != content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)

print(f"Cards and tables restructured.")
