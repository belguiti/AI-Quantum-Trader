import os

def rewrite_topbar():
    file_path = r'c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components\layout\topbar\topbar.component.ts'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The goal is no borders, floating elements, massive pills.
    # Replace header wrapper
    content = content.replace(
        'h-16 bg-surf-cardLight/80 dark:bg-surf-cardDark/80 backdrop-blur-md border-b border-surf-borderLight dark:border-surf-borderDark flex items-center justify-between px-6 fixed top-0 right-0 left-0 md:left-64 z-40 transition-[left] duration-300',
        'h-20 bg-transparent flex items-center justify-between px-4 sm:px-8 fixed top-0 right-0 left-0 md:left-64 z-40 transition-[left] duration-300 pt-4'
    )

    # Exchange Status Pill
    content = content.replace(
        'hidden sm:flex items-center space-x-2 bg-surf-mutedLight dark:bg-surf-mutedDark px-3 py-1.5 rounded-full border border-surf-borderLight dark:border-surf-borderDark',
        'hidden sm:flex items-center space-x-2 bg-white dark:bg-surf-cardDark shadow-sm px-4 py-2 rounded-full'
    )

    # Wallet Balance Area (Remove left borders entirely, make it look like a standalone pill or just clean text)
    content = content.replace(
        'flex items-center space-x-3 pl-6 border-l border-surf-borderLight dark:border-surf-borderDark',
        'flex items-center space-x-3 pl-2 sm:pl-6'
    )
    
    # Text adjustments for balance
    content = content.replace(
        'text-[0.65rem] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white uppercase tracking-widest',
        'text-[0.65rem] text-slate-400 uppercase tracking-widest font-semibold'
    )
    content = content.replace('text-lg font-bold text-slate-900 dark:text-white tracking-tight', 'text-2xl font-bold text-slate-900 dark:text-white tracking-tighter')

    # Actions & Tools (Remove left borders)
    content = content.replace(
        'flex items-center space-x-4 pl-6 border-l border-surf-borderLight dark:border-surf-borderDark',
        'flex items-center space-x-2 sm:space-x-4 pl-2 sm:pl-6 bg-white dark:bg-surf-cardDark shadow-sm px-2 py-1.5 sm:px-4 sm:py-2 rounded-full'
    )
    
    # Language Selector Pill
    content = content.replace(
        'flex rounded-xl bg-surf-mutedLight dark:bg-surf-mutedDark border border-surf-borderLight dark:border-surf-borderDark p-1',
        'flex rounded-full bg-surf-mutedLight dark:bg-surf-mutedDark p-1'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def rewrite_sidebar():
    file_path = r'c:\Users\azdin\.gemini\antigravity\scratch\ai-quantum-trader\frontend\src\app\components\layout\sidebar\sidebar.component.ts'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Redesign sidebar container (No right border, solid background matching theme)
    content = content.replace(
        'w-64 h-screen bg-surf-cardLight dark:bg-surf-cardDark text-slate-900 dark:text-white backdrop-blur-xl border-r border-surf-borderLight dark:border-surf-borderDark flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0',
        'w-64 h-screen bg-surf-baseLight dark:bg-surf-baseDark text-slate-900 dark:text-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0'
    )
    
    # Header logo area
    content = content.replace(
        'h-16 flex items-center px-6 border-b border-surf-borderLight dark:border-surf-borderDark justify-between',
        'h-24 flex items-center px-6 justify-between pt-4'
    )

    # User Profile Mini
    content = content.replace(
        'p-4 border-t border-surf-borderLight dark:border-surf-borderDark',
        'p-6 pb-8'
    )

    # Links are already styled well from previous generic pill script, but double check active link
    content = content.replace(
        '!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-medium shadow-sm',
        '!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

rewrite_topbar()
rewrite_sidebar()
print("Topbar and Sidebar refactored for minimalist aesthetic.")

