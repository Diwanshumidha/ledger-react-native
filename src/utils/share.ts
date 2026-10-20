import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * Opens the system share sheet with plain text. Desktop browsers mostly have
 * no share sheet, so on web the text goes to the clipboard instead and the
 * caller tells the person to paste it.
 */
export async function shareText(message: string): Promise<ShareOutcome> {
  const canWebShare =
    Platform.OS !== 'web' || (typeof navigator !== 'undefined' && 'share' in navigator);

  if (canWebShare) {
    try {
      const result = await Share.share({ message });
      return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
    } catch (error) {
      // Closing the browser share sheet rejects with AbortError.
      if (error instanceof Error && error.name === 'AbortError') {
        return 'dismissed';
      }
      if (Platform.OS !== 'web') {
        return 'failed';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(message);
    return 'copied';
  } catch {
    return 'failed';
  }
}
