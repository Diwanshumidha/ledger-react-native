import { Platform } from 'react-native';

/**
 * Where the "pay by UPI" web page (`public/pay/index.html`) is hosted, e.g.
 * `https://ledger.example.com/pay/`. Set `EXPO_PUBLIC_PAY_PAGE_URL` in `.env`.
 *
 * Without it, messages carry no clickable link — only the UPI ID and, in the
 * shared image, the QR code. The web build serves the page itself, so there
 * it falls back to its own address.
 */
export const PAY_PAGE_URL: string | null =
  process.env.EXPO_PUBLIC_PAY_PAGE_URL ||
  (Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/pay/`
    : null);
