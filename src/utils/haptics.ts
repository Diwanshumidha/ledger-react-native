import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Two kinds of touch feedback, used sparingly so they keep meaning something:
 * a light tick for small choices, a fuller buzz when money is recorded.
 * Browsers have no haptics, and a phone that refuses (battery saver, haptics
 * off) is fine — feedback is never worth an error.
 */
const enabled = Platform.OS !== 'web';

/** A swipe opening, a chip or key tapped. */
export function tick(): void {
  if (enabled) {
    Haptics.selectionAsync().catch(() => {});
  }
}

/** An entry saved, a balance settled, a payment recorded. */
export function success(): void {
  if (enabled) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}
