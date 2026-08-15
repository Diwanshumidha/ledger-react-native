import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 *
 * `useSyncExternalStore` gives us "has the client hydrated yet" without a
 * setState-in-effect, so the first client render already matches the server's
 * `light` output and no cascading render is triggered.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
