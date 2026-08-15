import { Platform, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  multiline?: boolean;
  error?: string;
  maxLength?: number;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoFocus = false,
  multiline = false,
  error,
  maxLength,
}: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        multiline={multiline}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={[
          styles.input,
          noFocusRing,
          multiline && styles.multiline,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.negative : theme.border,
          },
        ]}
      />
      {error ? (
        <ThemedText type="small" style={{ color: theme.negative }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    fontWeight: '500',
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});

const noFocusRing = Platform.select({ web: { outline: 'none' }, default: undefined });
