/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0c",
                card: "#111114",
                border: "#1f1f23",
                primary: "#10b981", // Emerald
                secondary: "#3b82f6", // Blue
                danger: "#ef4444", // Red
                warning: "#f59e0b", // Amber
                text: "#e4e4e7",
                muted: "#a1a1aa"
            }
        },
    },
    plugins: [],
}
