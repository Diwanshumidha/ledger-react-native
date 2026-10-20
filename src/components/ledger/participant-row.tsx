import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { settle } from '@/constants/motion';
import { FontFaces, Radius, Spacing } from '@/constants/theme';
import { formatAmount, type Money } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';

export interface ParticipantRowProps {
  name: string;
  hue: number;
  isIncluded: boolean;
  /** Share in minor units, shown when the split is computed for you. */
  amount: Money;
  /** True in exact mode, where the share is typed rather than computed. */
  editable: boolean;
  amountText: string;
  onToggle: () => void;
  onChangeAmount: (next: string) => void;
  /** Marks the person who paid the bill. */
  isPayer?: boolean;
  /** Explains why a share may not reach your books, e.g. "settles with Rahul". */
  hint?: string;
}

export function ParticipantRow({
  name,
  hue,
  isIncluded,
  amount,
  editable,
  amountText,
  onToggle,
  onChangeAmount,
  isPayer = false,
  hint,
}: ParticipantRowProps) {
  const theme = useTheme();

  return (
    // Reanimated owns opacity on a view it animates, so the dimming lives on
    // an inner view rather than the one carrying the layout transition.
    <Animated.View layout={settle}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: isIncluded ? theme.card : 'transparent',
            borderColor: isIncluded ? theme.border : 'transparent',
            opacity: isIncluded ? 1 : 0.5,
          },
        ]}>
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isIncluded }}
          accessibilityLabel={`${name}, ${isIncluded ? 'included' : 'not included'}`}
          onPress={onToggle}
          scaleTo={0.95}
          style={styles.identity}>
          <Avatar name={name} hue={hue} size={36} />
          <View style={styles.nameColumn}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {name}
            </ThemedText>
            {isPayer ? (
              <ThemedText type="small" style={{ color: theme.accent }}>
                paid the bill
              </ThemedText>
            ) : hint ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {hint}
              </ThemedText>
            ) : null}
          </View>
        </PressableScale>

        {isIncluded ? (
          editable ? (
            <View style={[styles.amountBox, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={amountText}
                onChangeText={(next) => onChangeAmount(next.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                inputMode="decimal"
                accessibilityLabel={`Share for ${name}`}
                style={[styles.amountInput, noFocusRing, { color: theme.text }]}
              />
            </View>
          ) : (
            <ThemedText type="smallBold" style={styles.computed}>
              {formatAmount(amount)}
            </ThemedText>
          )
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            not included
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    minWidth: 0,
  },
  nameColumn: {
    flex: 1,
    minWidth: 0,
  },
  computed: {
    minWidth: 84,
    textAlign: 'right',
  },
  amountBox: {
    height: 36,
    minWidth: 96,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  amountInput: {
    fontSize: 15,
    fontFamily: FontFaces.body[600],
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    paddingVertical: 0,
  },
});

const noFocusRing = Platform.select({
  web: { outline: 'none' },
  default: undefined,
});
