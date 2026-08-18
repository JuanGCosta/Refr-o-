/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060A0B", 900: "#0A1012", 800: "#10181B", 700: "#172226",
          600: "#203036", 500: "#2A3F45",
        },
        mist: { 400: "#64757A", 300: "#93A3A7", 200: "#C6D0D2", 100: "#EEF3F3" },
        volt: { DEFAULT: "#16C7B7", soft: "#5EEAD4", deep: "#0F8F86" },
        flare: { DEFAULT: "#83C93C", soft: "#B8E86C" },
        gold: { DEFAULT: "#F5B93E", soft: "#FDD98C" },
        mint: { DEFAULT: "#2FE0B0", soft: "#8FF4D9" },
        danger: { DEFAULT: "#FB5050", soft: "#FF8A8A" },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(22,199,183,0.22), 0 10px 34px -10px rgba(22,199,183,0.40)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #12BFB1 0%, #78C942 100%)",
        "brand-radial": "radial-gradient(circle at 30% 20%, rgba(22,199,183,0.22), transparent 55%)",
      },
      keyframes: {
        "pulse-ring": { "0%": { transform: "scale(0.9)", opacity: "0.6" }, "70%": { transform: "scale(1.4)", opacity: "0" }, "100%": { transform: "scale(1.4)", opacity: "0" } },
        "float-slow": { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
        eq: { "0%, 100%": { transform: "scaleY(0.3)" }, "50%": { transform: "scaleY(1)" } },
        "spin-slow": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        "float-slow": "float-slow 4s ease-in-out infinite",
        eq: "eq 0.9s ease-in-out infinite",
        "spin-slow": "spin-slow 6s linear infinite",
      },
    },
  },
  plugins: [],
};
