// src/app/theme/theme.ts
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

// 1. Define the color palette for a clean, professional barbershop
const colors = {
  brand: {
    // A sophisticated deep blue, evoking professionalism and trust
    50: '#E6F0F7', // Very light blue
    100: '#C2DCEB',
    200: '#9EBBDC',
    300: '#7AA0CC',
    400: '#5685BD',
    500: '#326AA0', // Primary brand color - a deep, professional blue
    600: '#2A5C8E',
    700: '#224E7C',
    800: '#1A406A',
    900: '#123258', // Darkest blue
  },
  neutral: {
    light: {
      'bg-primary': '#F9FAFB', // Very light, almost off-white for main background
      'bg-secondary': '#FFFFFF', // Crisp white for cards and sections
      'bg-header': '#FFFFFF',   // Clean white header
      'bg-card': '#FFFFFF',     // White card background for a clean look
      'text-primary': '#222222', // **UPDATED: Dark gray for main text**
      'text-secondary': '#4A5568', // Darker gray for secondary text
      'border-color': '#E2E8F0', // Subtle light gray for borders
      'input-bg': '#FFFFFF',    // White input background
      'input-border': '#CBD5E0', // Light input border
      'placeholder-color': '#A0AEC0', // Muted placeholder text
      'tag-bg': '#EDF2F7', // Light gray for tags
      'tag-color': '#4A5568', // Dark gray for tag text
      'status-green': '#38A169', // Confirmed
      'status-orange': '#ED8936', // Pending
      'status-red': '#E53E3E', // Cancelled
      'status-purple': '#805AD5', // Completed
    },
    dark: {
      'bg-primary': '#222222', // **UPDATED: Dark gray for main background**
      'bg-secondary': '#121212', // **UPDATED: Very dark charcoal for sections and secondary elements**
      'bg-header': '#151515',   // **UPDATED: Dark header**
      'bg-card': '#151515',     // **UPDATED: Dark card background for depth**
      'text-primary': '#F7FAFC', // Near-white for main text
      'text-secondary': '#A0AEC0', // Muted light gray for secondary text
      'border-color': '#444444', // **UPDATED: Medium-dark gray for borders**
      'input-bg': '#151515',    // **UPDATED: Dark input background**
      'input-border': '#444444', // **UPDATED: Darker input border**
      'placeholder-color': '#888888', // **UPDATED: Medium placeholder for better visibility**
      'tag-bg': '#151515', // **UPDATED: Slightly lighter dark gray for tags for better contrast**
      'tag-color': '#F7FAFC', // Near-white for tag text
      'status-green': '#48BB78', // Confirmed
      'status-orange': '#F6AD55', // Pending
      'status-red': '#FC8181', // Cancelled
      'status-purple': '#B794F4', // Completed
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
    },
    'html, #__next': {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    },
    // Styles for the page transition overlay
    '.page-transition-overlay': {
      backgroundColor: mode('white', 'rgba(51, 51, 51, 0.95)')(props), // Adjusted for new dark primary bg
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
    // Add color schemes for status tags (green, orange, red, purple)
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
    'dark-sm': '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.12)',
    'dark-md': '0 4px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
    'dark-lg': '0 10px 15px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.25)',
    'dark-xl': '0 20px 25px rgba(0,0,0,0.5), 0 10px 10px rgba(0,0,0,0.3)',
    outline: '0 0 0 3px rgba(50, 106, 160, 0.6)', // Brand blue outline
  },
  fonts: {
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
});

export default theme;
