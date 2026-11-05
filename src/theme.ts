// Design tokens copied from the Project 1 Figma file ("Design foundations").
export const colors = {
  canvas: '#F4F6F5', // bg/canvas
  surface: '#FFFFFF', // bg/surface
  sunken: '#EDF1F0', // bg/sunken
  lineSoft: '#E3EBEC', // line/soft
  lineStrong: '#C9D8DB', // line/strong

  ink900: '#0F2830',
  ink700: '#33525C',
  ink500: '#6E8892',
  ink300: '#AFC2C8',

  amber500: '#F2A81D',
  amber600: '#C9860B',
  amber100: '#FDECC6',

  mint600: '#167F63',
  mint500: '#1E9E7A',
  mint100: '#D8EFE7',

  coral500: '#E2603F',
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Type scale from the design file: Display 42, Title 32, Screen title 18, Body 15, Label 12, Micro 10.
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 42, letterSpacing: -1, color: colors.ink900 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink900 },
  screenTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink900 },
  heading: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink900 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink900 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink500 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink500 },
  micro: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 1, color: colors.ink500, textTransform: 'uppercase' as const },
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 22 };
