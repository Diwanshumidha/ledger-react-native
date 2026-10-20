import { useColorScheme } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface LogoMarkProps {
  /** Side of the square tile, in points. */
  size?: number;
}

/**
 * The Ledger app icon, drawn small: an "L" whose foot is the first line of a
 * bookkeeper's double rule, the second line — the one that rules a balance
 * off — in green, on a rounded tile. Shown as a tile rather than a bare mark
 * because beside a word a lone "L" reads as a stray letter.
 *
 * The tile is the theme's ink, so it inverts in dark mode: a paper tile with
 * an ink mark, like a light icon on a dark home screen.
 */
export function LogoMark({ size = 32 }: LogoMarkProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];
  // The green that reads on the tile is the other theme's.
  const rule = Colors[isDark ? 'light' : 'dark'].positive;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Rect width={1024} height={1024} rx={230} fill={theme.text} />
      <Rect x={352} y={236} width={120} height={454} rx={14} fill={theme.background} />
      <Rect x={352} y={626} width={320} height={64} rx={14} fill={theme.background} />
      <Rect x={352} y={726} width={320} height={64} rx={14} fill={rule} />
    </Svg>
  );
}
