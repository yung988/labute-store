// Shared email theme and styles
export const emailTheme = {
  colors: {
    // Brand colors
    primary: '#000000',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#000000',

    // Gray scale
    gray50: '#fafafa',
    gray100: '#f5f5f5',
    gray200: '#e5e5e5',
    gray300: '#d4d4d4',
    gray400: '#a3a3a3',
    gray500: '#737373',
    gray600: '#525252',
    gray700: '#404040',
    gray800: '#262626',
    gray900: '#171717',

    // Semantic colors
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626',
    info: '#2563eb',
  },

  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'Menlo, Monaco, "Courier New", monospace',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
} as const;

// Common email styles
export const emailStyles = {
  // Container styles
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px',
    backgroundColor: emailTheme.colors.background,
  },

  // Typography styles
  h1: {
    fontSize: '32px',
    fontWeight: 'bold',
    lineHeight: '1.2',
    margin: '0 0 24px 0',
    color: emailTheme.colors.foreground,
    fontFamily: emailTheme.fonts.primary,
  },

  h2: {
    fontSize: '24px',
    fontWeight: 'bold',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
    color: emailTheme.colors.foreground,
    fontFamily: emailTheme.fonts.primary,
  },

  h3: {
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.4',
    margin: '0 0 12px 0',
    color: emailTheme.colors.foreground,
    fontFamily: emailTheme.fonts.primary,
  },

  body: {
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
    color: emailTheme.colors.foreground,
    fontFamily: emailTheme.fonts.primary,
  },

  small: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: emailTheme.colors.gray600,
    fontFamily: emailTheme.fonts.primary,
  },

  // Brand logo style
  logo: {
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '0 0 32px 0',
    color: emailTheme.colors.foreground,
    fontFamily: emailTheme.fonts.primary,
    letterSpacing: '0.5px',
  },

  // Button styles
  button: {
    primary: {
      backgroundColor: emailTheme.colors.primary,
      color: emailTheme.colors.primaryForeground,
      padding: '12px 24px',
      borderRadius: emailTheme.borderRadius.md,
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '16px',
      display: 'inline-block',
      textAlign: 'center' as const,
      fontFamily: emailTheme.fonts.primary,
      border: 'none',
      cursor: 'pointer',
    },

    secondary: {
      backgroundColor: 'transparent',
      color: emailTheme.colors.foreground,
      padding: '12px 24px',
      borderRadius: emailTheme.borderRadius.md,
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '16px',
      display: 'inline-block',
      textAlign: 'center' as const,
      fontFamily: emailTheme.fonts.primary,
      border: `2px solid ${emailTheme.colors.gray300}`,
      cursor: 'pointer',
    },
  },

  // Section styles
  section: {
    margin: '24px 0',
    padding: '0',
  },

  divider: {
    border: 'none',
    borderTop: `1px solid ${emailTheme.colors.gray200}`,
    margin: '24px 0',
  },

  // Order/product styles
  orderItem: {
    padding: '12px 0',
    borderBottom: `1px solid ${emailTheme.colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  orderTotal: {
    padding: '16px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    borderTop: `2px solid ${emailTheme.colors.gray300}`,
    textAlign: 'right' as const,
  },

  // Footer styles
  footer: {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: `1px solid ${emailTheme.colors.gray200}`,
    fontSize: '12px',
    color: emailTheme.colors.gray500,
    textAlign: 'center' as const,
    lineHeight: '1.5',
  },
} as const;

// Utility functions
export const createEmailStyle = (baseStyle: any, overrides: any = {}) => ({
  ...baseStyle,
  ...overrides,
});

// Brand constants
export const BRAND = {
  name: 'YEEZUZ2020',
  tagline: '2020',
  supportEmail: 'info@yeezuz2020.com',
  website: 'https://yeezuz2020.com',
} as const;
