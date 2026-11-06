/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Inter Tight"', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        // WWP Brand tokens
        'brand-carbon': 'var(--brand-carbon)',
        'brand-white': 'var(--brand-white)',
        'brand-stone': 'var(--brand-stone)',
        terracotta: 'var(--terracotta)',
        'terracotta-text': 'var(--terracotta-text)',
        taupe: 'var(--taupe)',
        'taupe-soft': 'var(--taupe-soft)',
        sand: 'var(--sand)',
        olive: 'var(--olive)',
        ochre: 'var(--ochre)',
        slate: 'var(--slate)',
        mauve: 'var(--mauve)',
        ink: 'var(--ink)',
        'health-green': 'var(--health-green)',
        'health-green-soft': 'var(--health-green-soft)',
        'health-amber': 'var(--health-amber)',
        'health-amber-soft': 'var(--health-amber-soft)',
        'health-red': 'var(--health-red)',
        'health-red-soft': 'var(--health-red-soft)',
        'chart-1': 'var(--chart-1)',
        'chart-2': 'var(--chart-2)',
        'chart-3': 'var(--chart-3)',
        'chart-4': 'var(--chart-4)',
        'chart-5': 'var(--chart-5)',
        'viz-average': 'var(--viz-average)',
        'viz-member': 'var(--viz-member)',
        'viz-n1': 'var(--viz-n1)',
        'viz-n2': 'var(--viz-n2)',
        'viz-n3': 'var(--viz-n3)',
        'viz-n4': 'var(--viz-n4)',
        'viz-n5': 'var(--viz-n5)',
        // Semáforo backward compatibility mapping to brand health tokens
        semaforo: {
          verde: 'var(--health-green)',
          amarillo: 'var(--health-amber)',
          rojo: 'var(--health-red)',
          gris: 'var(--sand)',
        },
        hud: {
          cyan: 'var(--terracotta)',
          violet: 'var(--taupe)',
          purple: 'var(--mauve)',
          blue: 'var(--slate)',
          dark: 'var(--ink)',
          surface: 'var(--surface)',
          card: 'var(--card)',
        }
      },
      borderRadius: {
        '3xl': '34px',
        '2xl': '26px',
        xl: '20px',
        lg: '16px',
        md: '14px',
        sm: '12px',
        full: '9999px',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        cta: 'var(--shadow-cta)',
      }
    },
  },
  plugins: [],
}
