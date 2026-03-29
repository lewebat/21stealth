/**
 * CI Configuration — Single Source of Truth for visual identity.
 * After editing, run: npm run generate:ci
 * This regenerates src/styles/ci/variables.css automatically.
 */
const ci = {
  colors: {
    primary: '#d4f042',
    'primary-hover': '#bfdc2a',
    'primary-muted': '#2a3a10',
    secondary: '#64748b',
    'secondary-hover': '#475569',
    accent: '#f59e0b',
    'accent-hover': '#d97706',
    danger: '#ef4444',
    'danger-hover': '#dc2626',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',

    background: '#ffffff',
    surface: '#f8fafc',
    'surface-elevated': '#ffffff',
    border: '#e2e8f0',
    'border-strong': '#cbd5e1',

    text: '#0f172a',
    'text-muted': '#64748b',
    'text-subtle': '#94a3b8',
    'text-inverted': '#0d110a',
    'text-disabled': '#cbd5e1',

    'sidebar-bg': '#1e293b',
    'sidebar-text': '#e2e8f0',
    'sidebar-active': '#2563eb',
    'sidebar-border': 'rgb(255 255 255 / 0.1)',
    'sidebar-hover': 'rgb(255 255 255 / 0.08)',
  },

  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  spacing: {
    'section-sm': '3rem',
    'section-md': '5rem',
    'section-lg': '8rem',
    'container-sm': '640px',
    'container-md': '768px',
    'container-lg': '1024px',
    'container-xl': '1200px',
    'container-2xl': '1536px',
    'sidebar-width': '260px',
  },

  radius: {
    sm: '0.25rem',
    DEFAULT: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  transitions: {
    base: '150ms ease',
    fast: '100ms ease',
    slow: '300ms ease',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Dark mode overrides — extracted from design reference
  darkColors: {
    primary: '#d4f042',
    'primary-hover': '#bfdc2a',
    'primary-muted': '#2a3a10',
    secondary: '#6b7565',
    'secondary-hover': '#8a9583',
    accent: '#d4f042',
    'accent-hover': '#bfdc2a',

    background: '#0d110a',
    surface: '#161a12',
    'surface-elevated': '#1c2118',
    border: '#252b1f',
    'border-strong': '#323829',

    text: '#e8ede6',
    'text-muted': '#6b7565',
    'text-subtle': '#4a5245',
    'text-inverted': '#0d110a',
    'text-disabled': '#3a4035',

    'sidebar-bg': '#0d110a',
    'sidebar-text': '#a8b5a4',
    'sidebar-active': '#d4f042',
    'sidebar-border': 'rgb(255 255 255 / 0.06)',
    'sidebar-hover': 'rgb(255 255 255 / 0.05)',
  },
}

export default ci
