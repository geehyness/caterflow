// src/app/theme/theme.ts
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

// 1. Define the color palette based on the provided brand colors
const colors = {
  brand: {
    // Using the provided blue colors
    50: '#E6F0FF',
    100: '#CCE0FF',
    200: '#99C2FF',
    300: '#66A3FF',
    400: '#3385FF',
    500: '#0067FF', // Primary brand blue
    600: '#0052CC',
    700: '#003E99',
    800: '#002966',
    900: '#001533',
  },
  accent: {
    blue: '#0067FF',
    darkBlue: '#0037C7',
    pink: '#FF007B',
    orange: '#FF6300',
    green: '#299C00',
    lightGreen: '#91CC00',
    black: '#151515',
  },
  neutral: {
    light: {
      'bg-primary': '#F5F7FA', // Very light, almost off-white for main background
      'bg-secondary': '#FFFFFF', // Crisp white for cards and sections
      'bg-header': '#FFFFFF',   // Clean white header
      'bg-card': '#FFFFFF',     // White card background for a clean look
      'text-primary': '#151515', // Using the provided black
      'text-secondary': '#4A5568', // Darker gray for secondary text
      'border-color': '#E2E8F0', // Subtle light gray for borders
      'input-bg': '#FFFFFF',    // White input background
      'input-border': '#CBD5E0', // Light input border
      'placeholder-color': '#A0AEC0', // Muted placeholder text
      'tag-bg': '#EDF2F7', // Light gray for tags
      'tag-color': '#4A5568', // Dark gray for tag text
      'status-green': '#299C00', // Confirmed (using provided green)
      'status-orange': '#FF6300', // Pending (using provided orange)
      'status-red': '#E53E3E', // Cancelled
      'status-purple': '#805AD5', // Completed
      'status-pink': '#FF007B', // Additional status (using provided pink)
    },
    dark: {
      // Updated dark theme with Mac-like aesthetics using brand colors
      'bg-primary': '#151515', // Using the provided black
      'bg-secondary': '#1A1A1A', // Slightly lighter for depth
      'bg-header': '#1A1A1A',   // Header with subtle contrast
      'bg-card': '#1F1F1F',     // Card background with depth
      'text-primary': '#F0F1F5', // Soft white for primary text
      'text-secondary': '#A3A7B5', // Muted light gray for secondary text
      'border-color': '#2D2D2D', // Subtle border color
      'input-bg': '#1F1F1F',    // Input background matching cards
      'input-border': '#2D2D2D', // Input border matching other borders
      'placeholder-color': '#7A7F8E', // Medium placeholder for better visibility
      'tag-bg': '#2A2A2A', // Slightly lighter dark gray for tags
      'tag-color': '#E2E5ED', // Light gray for tag text
      'status-green': '#91CC00', // Confirmed (using provided light green)
      'status-orange': '#FF6300', // Pending (using provided orange)
      'status-red': '#FC8181', // Cancelled
      'status-purple': '#B794F4', // Completed
      'status-pink': '#FF007B', // Additional status (using provided pink)
    },
  },
};

// 2. Configure initial color mode
const config: ThemeConfig = {
  initialColorMode: 'dark', // Set initial theme to dark mode
  useSystemColorMode: false, // Don't use the system's color mode preference
};

// 3. Define global styles
const styles = {
  global: (props: Record<string, any>) => ({
    body: {
      bg: mode(colors.neutral.light['bg-primary'], colors.neutral.dark['bg-primary'])(props),
      color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontSmooth: 'antialiased', // Mac-like font smoothing
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    'html, #__next': {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    },
    // Styles for the page transition overlay
    '.page-transition-overlay': {
      backgroundColor: mode('rgba(255, 255, 255, 0.95)', 'rgba(21, 21, 21, 0.95)')(props),
    },
    // Wipe rows for transition
    '.wipe-row': {
      backgroundColor: mode(colors.brand[500], colors.brand[500])(props), // Use brand color for wipes
    },
    '.loading-spinner-container': {
      backgroundColor: mode(colors.neutral.light['bg-primary'], colors.neutral.dark['bg-primary'])(props),
      boxShadow: mode('lg', 'dark-lg')(props), // Add subtle shadow
      borderRadius: 'md',
      padding: '4',
    },
    // General link styling for non-Chakra Link components (e.g., NextLink)
    a: {
      color: mode(colors.brand[500], colors.brand[300])(props),
      _hover: {
        textDecoration: 'underline',
      },
    },
    // Scrollbar styling for Mac-like appearance
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: mode('#F1F1F1', '#2A2A2A')(props),
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      background: mode('#C1C1C1', '#404040')(props),
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: mode('#A8A8A8', '#505050')(props),
    },
    // Selection styling
    '::selection': {
      backgroundColor: mode('rgba(0, 103, 255, 0.2)', 'rgba(0, 103, 255, 0.4)')(props),
    },
  }),
};

// 4. Component overrides for a beautiful, professional look
const components = {
  Button: {
    baseStyle: (props: Record<string, any>) => ({
      fontWeight: 'semibold', // Slightly bolder for professionalism
      borderRadius: 'lg', // More rounded for a softer, modern feel
      _focus: {
        boxShadow: 'outline',
      },
      _active: {
        transform: 'scale(0.98)',
      },
      transition: 'all 0.2s ease-in-out', // Smooth transitions
    }),
    variants: {
      solid: (props: Record<string, any>) => ({
        bg: props.colorScheme === 'brand' ? mode(colors.brand[500], colors.brand[500])(props) : undefined,
        color: props.colorScheme === 'brand' ? 'white' : undefined,
        _hover: {
          bg: props.colorScheme === 'brand' ? mode(colors.brand[600], colors.brand[600])(props) : undefined,
          boxShadow: 'md', // Subtle lift on hover
          _disabled: {
            bg: mode('gray.200', 'whiteAlpha.300')(props),
          },
        },
        _active: {
          bg: props.colorScheme === 'brand' ? mode(colors.brand[700], colors.brand[700])(props) : undefined,
        },
      }),
      outline: (props: Record<string, any>) => ({
        borderColor: props.colorScheme === 'brand' ? mode(colors.brand[500], colors.brand[400])(props) : mode(colors.neutral.light['border-color'], colors.neutral.dark['border-color'])(props),
        color: props.colorScheme === 'brand' ? mode(colors.brand[500], colors.brand[400])(props) : mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
        _hover: {
          bg: props.colorScheme === 'brand' ? mode(colors.brand[50], colors.brand[900])(props) : mode(colors.neutral.light['bg-secondary'], colors.neutral.dark['bg-secondary'])(props),
          borderColor: props.colorScheme === 'brand' ? mode(colors.brand[600], colors.brand[500])(props) : undefined,
          boxShadow: 'sm', // Subtle lift on hover
        },
      }),
      ghost: (props: Record<string, any>) => ({
        color: mode(colors.neutral.light['text-secondary'], colors.neutral.dark['text-secondary'])(props),
        _hover: {
          bg: mode(colors.neutral.light['tag-bg'], colors.neutral.dark['tag-bg'])(props),
          color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
        },
      }),
    },
  },
  Card: {
    baseStyle: (props: Record<string, any>) => ({
      container: {
        bg: mode(colors.neutral.light['bg-card'], colors.neutral.dark['bg-card'])(props),
        borderRadius: 'xl', // More pronounced rounded corners for elegance
        boxShadow: mode('md', 'dark-md')(props), // Slightly stronger shadow for definition
        borderColor: mode(colors.neutral.light['border-color'], colors.neutral.dark['border-color'])(props),
        borderWidth: '1px',
        transition: 'all 0.2s ease-in-out', // Smooth transitions for hover effects if any
        backdropFilter: 'blur(10px)', // Mac-like glass effect
      },
    }),
  },
  Link: {
    baseStyle: (props: Record<string, any>) => ({
      color: mode(colors.brand[500], colors.brand[300])(props),
      _hover: {
        textDecoration: 'underline',
        color: mode(colors.brand[600], colors.brand[400])(props),
      },
    }),
  },
  Input: {
    variants: {
      outline: (props: Record<string, any>) => ({
        field: {
          bg: mode(colors.neutral.light['input-bg'], colors.neutral.dark['input-bg'])(props),
          borderColor: mode(colors.neutral.light['input-border'], colors.neutral.dark['input-border'])(props),
          _hover: {
            borderColor: mode(colors.brand[300], colors.brand[400])(props),
          },
          _focusVisible: {
            borderColor: mode(colors.brand[500], colors.brand[300])(props),
            boxShadow: `0 0 0 1px ${mode(colors.brand[500], colors.brand[300])(props)}`,
          },
          _placeholder: {
            color: mode(colors.neutral.light['placeholder-color'], colors.neutral.dark['placeholder-color'])(props),
          },
        },
      }),
    },
  },
  Textarea: {
    variants: {
      outline: (props: Record<string, any>) => ({
        bg: mode(colors.neutral.light['input-bg'], colors.neutral.dark['input-bg'])(props),
        borderColor: mode(colors.neutral.light['input-border'], colors.neutral.dark['input-border'])(props),
        _hover: {
          borderColor: mode(colors.brand[300], colors.brand[400])(props),
        },
        _focusVisible: {
          borderColor: mode(colors.brand[500], colors.brand[300])(props),
          boxShadow: `0 0 0 1px ${mode(colors.brand[500], colors.brand[300])(props)}`,
        },
        _placeholder: {
          color: mode(colors.neutral.light['placeholder-color'], colors.neutral.dark['placeholder-color'])(props),
        },
      }),
    },
  },
  Select: {
    variants: {
      outline: (props: Record<string, any>) => ({
        field: {
          bg: mode(colors.neutral.light['input-bg'], colors.neutral.dark['input-bg'])(props),
          borderColor: mode(colors.neutral.light['input-border'], colors.neutral.dark['input-border'])(props),
          _hover: {
            borderColor: mode(colors.brand[300], colors.brand[400])(props),
          },
          _focusVisible: {
            borderColor: mode(colors.brand[500], colors.brand[300])(props),
            boxShadow: `0 0 0 1px ${mode(colors.brand[500], colors.brand[300])(props)}`,
          },
          _placeholder: {
            color: mode(colors.neutral.light['placeholder-color'], colors.neutral.dark['placeholder-color'])(props),
          },
        },
      }),
    },
  },
  Tag: {
    baseStyle: (props: Record<string, any>) => ({
      container: {
        bg: mode(colors.neutral.light['tag-bg'], colors.neutral.dark['tag-bg'])(props),
        color: mode(colors.neutral.light['tag-color'], colors.neutral.dark['tag-color'])(props),
        borderRadius: 'md', // Consistent rounding
      },
    }),
    // Add color schemes for status tags (green, orange, red, purple, pink)
    variants: {
      subtle: (props: Record<string, any>) => {
        let bgColor = '';
        let textColor = '';
        if (props.colorScheme === 'green') {
          bgColor = mode(colors.neutral.light['status-green'], colors.neutral.dark['status-green'])(props);
          textColor = mode('white', 'white')(props);
        } else if (props.colorScheme === 'orange') {
          bgColor = mode(colors.neutral.light['status-orange'], colors.neutral.dark['status-orange'])(props);
          textColor = mode('white', 'white')(props);
        } else if (props.colorScheme === 'red') {
          bgColor = mode(colors.neutral.light['status-red'], colors.neutral.dark['status-red'])(props);
          textColor = mode('white', 'white')(props);
        } else if (props.colorScheme === 'purple') {
          bgColor = mode(colors.neutral.light['status-purple'], colors.neutral.dark['status-purple'])(props);
          textColor = mode('white', 'white')(props);
        } else if (props.colorScheme === 'pink') {
          bgColor = mode(colors.neutral.light['status-pink'], colors.neutral.dark['status-pink'])(props);
          textColor = mode('white', 'white')(props);
        } else { // Default to gray
          bgColor = mode('gray.100', 'whiteAlpha.300')(props);
          textColor = mode('gray.800', 'whiteAlpha.800')(props);
        }
        return {
          container: {
            bg: bgColor,
            color: textColor,
          },
        };
      },
    },
  },
  // Add Table styling for a cleaner look
  Table: {
    baseStyle: (props: Record<string, any>) => ({
      th: {
        color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
        borderColor: mode(colors.neutral.light['border-color'], colors.neutral.dark['border-color'])(props),
        fontWeight: 'bold',
        textTransform: 'capitalize', // Keep first letter capitalized, not all caps
      },
      td: {
        color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
        borderColor: mode(colors.neutral.light['border-color'], colors.neutral.dark['border-color'])(props),
      },
      // Ensure Table component uses the card background for its container
      container: {
        bg: mode(colors.neutral.light['bg-card'], colors.neutral.dark['bg-card'])(props),
        borderRadius: 'lg',
        boxShadow: mode('md', 'dark-md')(props),
        border: '1px solid',
        borderColor: mode(colors.neutral.light['border-color'], colors.neutral.dark['border-color'])(props),
      },
    }),
  },
  // Add Menu component styling for Mac-like appearance
  Menu: {
    baseStyle: (props: Record<string, any>) => ({
      list: {
        bg: mode('white', colors.neutral.dark['bg-card'])(props),
        border: 'none',
        borderRadius: 'lg',
        boxShadow: mode('lg', 'dark-lg')(props),
        py: 2,
        backdropFilter: 'blur(10px)', // Mac-like glass effect
      },
      item: {
        bg: 'transparent',
        color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
        _hover: {
          bg: mode(colors.neutral.light['tag-bg'], colors.neutral.dark['tag-bg'])(props),
        },
        _focus: {
          bg: mode(colors.neutral.light['tag-bg'], colors.neutral.dark['tag-bg'])(props),
        },
      },
    }),
  },
  // Add Modal component styling
  Modal: {
    baseStyle: (props: Record<string, any>) => ({
      dialog: {
        bg: mode(colors.neutral.light['bg-card'], colors.neutral.dark['bg-card'])(props),
        borderRadius: 'xl',
        boxShadow: mode('xl', 'dark-xl')(props),
        backdropFilter: 'blur(10px)', // Mac-like glass effect
      },
      header: {
        color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
        fontWeight: 'semibold',
      },
      body: {
        color: mode(colors.neutral.light['text-primary'], colors.neutral.dark['text-primary'])(props),
      },
    }),
  },
  // Add Divider component styling
  Divider: {
    baseStyle: (props: Record<string, any>) => ({
      borderColor: mode(colors.neutral.light['border-color'], colors.neutral.dark['border-color'])(props),
    }),
  },
};

// 5. Extend the theme
const theme = extendTheme({
  config,
  colors,
  styles,
  components,
  shadows: {
    // Custom subtle shadows for elegance and professionalism
    sm: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
    md: '0 4px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
    lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
    'dark-sm': '0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
    'dark-md': '0 4px 6px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)',
    'dark-lg': '0 10px 15px rgba(0,0,0,0.25), 0 4px 6px rgba(0,0,0,0.2)',
    'dark-xl': '0 20px 25px rgba(0,0,0,0.35), 0 10px 10px rgba(0,0,0,0.25)',
    outline: `0 0 0 3px ${colors.brand[500]}20`, // Brand blue outline with opacity
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
  },
  // Add Mac-like transitions
  transitions: {
    property: {
      common: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
    },
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
  },
  // Add layer styles for Mac-like effects
  layerStyles: {
    'mac-card': {
      bg: 'white',
      borderRadius: 'xl',
      boxShadow: 'md',
      border: '1px solid',
      borderColor: 'border-color',
      backdropFilter: 'blur(10px)',
    },
    'mac-card-dark': {
      bg: 'neutral.dark.bg-card',
      borderRadius: 'xl',
      boxShadow: 'dark-md',
      border: '1px solid',
      borderColor: 'border-color',
      backdropFilter: 'blur(10px)',
    },
  },
});

export default theme;