import type { Config } from "tailwindcss";

/**
 * Tailwind CSS v4 configuration
 * Following official v4 documentation guidelines:
 * https://tailwindcss.com/blog/tailwindcss-v4
 */
const config: Config = {
  // Content paths - v4 has better automatic detection but we still specify key paths
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  
  // Dark mode configuration - using class strategy for manual control
  darkMode: "class",
  
  // Forward-looking features
  future: {
    hoverOnlyWhenSupported: true,
  },
  
  // Theme configuration - minimal since most styling is done via CSS variables
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 8s ease infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(66, 153, 225, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(66, 153, 225, 0.8)' },
        }
      },
      backgroundSize: {
        'gradient-size': '200% 200%',
      },
    },
  },
  
  // Optional: Plugins - none needed at this point
  plugins: [],
};

export default config;