import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

import { StatementCard } from '@/components/ledger/statement-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { HydrationGate } from '@/components/ui/hydration-gate';
import { Screen } from '@/components/ui/screen';
import { riseIn } from '@/constants/motion';
import { PAY_PAGE_URL } from '@/constants/config';
import { Spacing } from '@/constants/theme';
import { balanceOf, buildStatement, splitAtLastSettlement } from '@/domain/accounting';
import { buildPaymentLinkText, buildShareText, upiLinkForBalance } from '@/domain/share-text';
import { useAccount, useLedger, useProfile } from '@/state/ledger-store';
import { shareText } from '@/utils/share';

const NOTICE_MS = 3000;
/** Capturing a view as a picture needs a phone; browsers get the text version. */
const CAN_SHARE_IMAGE = Platform.OS !== 'web';

export default function ShareStatementScreen() {
  return (
    <HydrationGate>
      <ShareStatement />
    </HydrationGate>
  );
}

function ShareStatement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entries } = useLedger();
  const account = useAccount(id);
  const profile = useProfile();
  const card = useRef<View>(null);

  const [isSharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const balance = useMemo(() => (id ? balanceOf(id, entries) : 0), [entries, id]);
  // Only what is still open: settled business is between you and your history.
  const statement = useMemo(
    () => (id ? splitAtLastSettlement(buildStatement(id, entries)).open : []),
    [entries, id],
  );

  if (!account) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          glyph="🔍"
          title="Ledger not found"
          message="It may have been deleted."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const upiLink = upiLinkForBalance(account, balance, profile);
  const owedToYou = account.role === 'party' && balance > 0;

  const shareImage = async () => {
    if (!card.current) {
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: `Statement for ${account.name}`,
      });
    } catch {
      setNotice('Could not make the image. Try sending it as text.');
    } finally {
      setSharing(false);
    }
  };

  const paymentLinkText = buildPaymentLinkText(account, balance, profile, PAY_PAGE_URL);

  const send = async (message: string) => {
    const outcome = await shareText(message);
    if (outcome === 'copied') {
      setNotice('Copied. Paste it into a chat.');
    } else if (outcome === 'failed') {
      setNotice('Could not share from this device.');
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={riseIn(0, 6)} style={styles.preview}>
          <StatementCard
            ref={card}
            account={account}
            balance={balance}
            statement={statement}
            profile={profile}
            upiLink={upiLink}
          />
        </Animated.View>

        {owedToYou && !profile.upiId ? (
          <Pressable accessibilityRole="link" onPress={() => router.push('/settings')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              <ThemedText type="link">Add your UPI ID</ThemedText> to put a pay QR code on this.
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {notice ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            accessibilityLiveRegion="polite"
            style={styles.hint}>
            {notice}
          </ThemedText>
        ) : null}
        {CAN_SHARE_IMAGE ? (
          <Button label="Share statement" onPress={shareImage} busy={isSharing} />
        ) : null}
        <View style={styles.secondary}>
          {paymentLinkText ? (
            <Button
              label="Payment link"
              variant="ghost"
              onPress={() => send(paymentLinkText)}
              style={styles.secondaryButton}
            />
          ) : null}
          <Button
            label="As text"
            variant="ghost"
            onPress={() => send(buildShareText(account, balance, statement, profile, PAY_PAGE_URL))}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  preview: {
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  secondary: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
});
