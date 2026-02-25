import re

def process_sidebar():
    with open(r'c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components\layout\sidebar\sidebar.component.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Sidebar Background
    content = content.replace('bg-white dark:bg-slate-950', 'bg-surf-cardLight dark:bg-surf-cardDark')
    content = content.replace('text-slate-900 dark:text-slate-100', 'text-slate-900 dark:text-white')
    content = content.replace('border-slate-100 dark:border-slate-700/50', 'border-surf-borderLight dark:border-surf-borderDark')
    
    # Active Links
    content = content.replace('routerLinkActive="bg-primary/10 text-primary border-r-2 border-primary"', 'routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-medium shadow-sm"')
    
    # Admin Active Link
    content = content.replace('routerLinkActive="bg-red-900/20 text-rose-600 dark:text-rose-400 border-r-2 border-red-500"', 'routerLinkActive="!bg-rose-500 !text-white font-medium shadow-sm"')

    # Normal Links (Pill shapes now)
    content = content.replace('px-3 py-2.5 rounded-lg', 'px-4 py-3 rounded-[20px]')
    content = content.replace('hover:bg-slate-50 dark:bg-slate-800/50', 'hover:bg-surf-mutedLight dark:hover:bg-surf-mutedDark')
    content = content.replace('text-slate-500 dark:text-slate-400', 'text-slate-500 dark:text-slate-400')
    content = content.replace('hover:text-slate-800 dark:text-slate-100', 'hover:text-slate-900 dark:hover:text-white')

    with open(r'c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components\layout\sidebar\sidebar.component.ts', 'w', encoding='utf-8') as f:
        f.write(content)

def process_topbar():
    with open(r'c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components\layout\topbar\topbar.component.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Topbar Background
    content = content.replace('bg-white/80 dark:bg-black/40', 'bg-surf-cardLight/80 dark:bg-surf-cardDark/80')
    content = content.replace('border-gray-200 dark:border-white/5', 'border-surf-borderLight dark:border-surf-borderDark')
    content = content.replace('border-gray-200 dark:border-white/10', 'border-surf-borderLight dark:border-surf-borderDark')
    content = content.replace('bg-gray-100 dark:bg-white/5', 'bg-surf-mutedLight dark:bg-surf-mutedDark')
    
    # Modals / Dropdowns
    content = content.replace('bg-white dark:bg-[#12121a]', 'bg-surf-cardLight dark:bg-surf-cardDark')
    content = content.replace('bg-white dark:bg-[#0a0a12]', 'bg-surf-cardLight dark:bg-surf-cardDark')
    
    with open(r'c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components\layout\topbar\topbar.component.ts', 'w', encoding='utf-8') as f:
        f.write(content)

process_sidebar()
process_topbar()
print("Layout styles updated for soft aesthetic.")
