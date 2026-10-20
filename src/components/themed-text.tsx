import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyFor, Fonts, type FontFace, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'heading'
    | 'figure'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link'
    | 'code';
  themeColor?: ThemeColor;
  /** Overrides the face the type would normally use. */
  face?: FontFace;
};

/** Types set in the display face; everything else uses the body face. */
const DISPLAY_TYPES = new Set<ThemedTextProps['type']>(['title', 'heading', 'figure']);

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  face,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  const flat: TextStyle = StyleSheet.flatten<TextStyle>([
    { color: theme[themeColor ?? 'text'] },
    styles[type],
    style,
  ]);

  // The weight picks a font file; leaving `fontWeight` set as well would make
  // browsers synthesise a second bold on top of an already-bold face.
  const { fontWeight, ...withoutWeight } = flat;
  const resolved =
    type === 'code'
      ? flat
      : {
          ...withoutWeight,
          fontFamily:
            flat.fontFamily ?? fontFamilyFor(face ?? (DISPLAY_TYPES.has(type) ? 'display' : 'body'), fontWeight),
        };

  return <Text style={resolved} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: 700,
    letterSpacing: -0.6,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  /** Money. Tabular so columns of amounts line up digit for digit. */
  figure: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
