import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "-apple-system", "sans-serif"], inter: ["Inter", "system-ui", "-apple-system", "sans-serif"] },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        royal: { DEFAULT: "hsl(var(--royal) / <alpha-value>)", light: "hsl(var(--royal-light) / <alpha-value>)", dark: "hsl(var(--royal-dark) / <alpha-value>)", tint: "hsl(var(--royal-tint) / <alpha-value>)" },
        turquoise: { DEFAULT: "hsl(var(--turquoise) / <alpha-value>)", deep: "hsl(var(--turquoise-deep) / <alpha-value>)", tint: "hsl(var(--turquoise-tint) / <alpha-value>)" },
        electric: { DEFAULT: "hsl(var(--electric) / <alpha-value>)", tint: "hsl(var(--electric-tint) / <alpha-value>)" },
        jade: { DEFAULT: "hsl(var(--jade) / <alpha-value>)", tint: "hsl(var(--jade-tint) / <alpha-value>)" },
        amber: { DEFAULT: "hsl(var(--amber) / <alpha-value>)", tint: "hsl(var(--amber-tint) / <alpha-value>)" },
        coral: { DEFAULT: "hsl(var(--coral) / <alpha-value>)", tint: "hsl(var(--coral-tint) / <alpha-value>)" },
        ice: "hsl(var(--ice) / <alpha-value>)",
        mist: "hsl(var(--mist) / <alpha-value>)",
        ink: { DEFAULT: "hsl(var(--ink) / <alpha-value>)", soft: "hsl(var(--ink-soft) / <alpha-value>)" },
        health: {
          green: "hsl(var(--health-green))", "green-light": "hsl(var(--health-green-light))", "green-dark": "hsl(var(--health-green-dark))",
          mint: "hsl(var(--health-mint))", "mint-hover": "hsl(var(--health-mint-hover))", sage: "hsl(var(--health-sage))",
          text: "hsl(var(--health-text))", "text-light": "hsl(var(--health-text-light))",
        },
      },
      boxShadow: {
        soft: "0 4px 24px -2px hsl(227 78% 36% / 0.12)",
        card: "0 2px 16px -4px hsl(226 60% 20% / 0.09)",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)", xl: "0.9rem", "2xl": "1.25rem" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: { "accordion-down": "accordion-down 0.2s ease-out", "accordion-up": "accordion-up 0.2s ease-out" },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
