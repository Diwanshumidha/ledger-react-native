import { useLocalSearchParams, useRouter } from 'expo-router';

import { SplitExpenseComposer } from '@/components/ledger/split-expense-composer';
import { HydrationGate } from '@/components/ui/hydration-gate';
import { Screen } from '@/components/ui/screen';

export default function SplitExpenseScreen() {
  const params = useLocalSearchParams<{ ledgerId?: string }>();
  const router = useRouter();

  return (
    <Screen edges={['bottom']}>
      <HydrationGate>
        <SplitExpenseComposer
          initialLedgerId={params.ledgerId}
          onSaved={() => {
            // This screen can be deep-linked to on the web, where there is no
            // history to pop back to.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/journal');
            }
          }}
        />
      </HydrationGate>
    </Screen>
  );
}
