import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08070a",
        paper: "#fff8df",
        stallYellow: "#ffd400",
        stallRed: "#ff2d2d",
        stallPurple: "#7c2cff"
      },
      fontFamily: {
        display: ["Impact", "Haettenschweiler", "Arial Narrow", "sans-serif"],
        sans: ["Arial", "Helvetica", "sans-serif"]
      },
      boxShadow: {
        brutal: "8px 8px 0 #08070a",
        red: "6px 6px 0 #ff2d2d",
        purple: "6px 6px 0 #7c2cff"
      }
    }
  },
  plugins: []
};

export default config;
