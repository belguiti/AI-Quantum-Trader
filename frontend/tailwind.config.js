/** @type {import('tailwindcss').Config} */
module.exports = {
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
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
