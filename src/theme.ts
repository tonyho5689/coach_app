// Central design tokens — warm, light fitness-app theme.
export const colors = {
  bg: '#F4EFE6', // warm cream app background
  bgElevated: '#FBF9F4', // header / tab bar / composer surfaces
  card: '#FFFFFF',
  cardAlt: '#ECE4D6', // stat tiles, progress tracks, inputs
  border: '#E5DCCB', // soft warm border
  text: '#26211C', // warm near-black
  textMuted: '#8C8378',
  textDim: '#A89F92',
  primary: '#C15A3C', // terracotta
  primaryDark: '#A84A30',
  primarySoft: 'rgba(193,90,60,0.12)',
  onPrimary: '#FFFFFF', // text/icons on primary or danger fills
  accent: '#4A7BA6', // muted blue
  protein: '#3B82C4', // blue
  carbs: '#E0A32E', // amber
  fat: '#D96BA0', // rose
  calories: '#C15A3C', // terracotta (matches primary)
  danger: '#D9544A',
  warn: '#C8881A', // amber, tuned for light bg legibility
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadow = {
  card: {
    shadowColor: '#3A2E20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
};
