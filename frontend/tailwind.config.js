/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0a',
                surface: '#111827',
                primary: '#00f2ff',
                secondary: '#00ff9d',
                accent: '#7c3aed',
                danger: '#ef4444',
                surf: {
                    baseLight: '#FDF7F0',
                    baseDark: '#121212',
                    cardLight: '#FFFFFF',
                    cardDark: '#1C1C1E',
                    borderLight: '#EAEAEA',
                    borderDark: '#2C2C2E',
                    mutedLight: '#F5EFE6',
                    mutedDark: '#252528',
                }
            },
            borderRadius: {
                '3xl': '24px',
                '4xl': '32px',
                'pill': '9999px',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            keyframes: {
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-3px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(3px)' },
                },
            },
            animation: {
                shake: 'shake 0.6s ease-in-out',
            },
        },
    },
    plugins: [],
}
