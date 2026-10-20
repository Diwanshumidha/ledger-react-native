import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import {
  StatementHeader,
  StatementRow,
  WIDE_STATEMENT_BREAKPOINT,
} from '@/components/ledger/statement-row';
import { SplitGroupCard } from '@/components/ledger/split-group-card';
import { ThemedText } from '@/components/themed-text';
import { AnimatedMoney } from '@/components/ui/animated-money';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DoubleRule } from '@/components/ui/double-rule';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { fadeIn, riseIn, rowIn, settle } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import {
  balanceOf,
  buildSettlement,
  buildStatement,
  describeAccountBalance,
  describePartyBalance,
  splitAtLastSettlement,
  summariseSharedLedger,
} from '@/domain/accounting';
import { formatDateShort } from '@/domain/date';
import { formatMoney, type Money } from '@/domain/money';
import { BANK_ACCOUNT_ID } from '@/domain/seed';
import type { SimpleDirection, StatementLine } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { buildUpiLink } from '@/domain/upi';
import { useAccount, useLedger, useLedgerActions, useProfile } from '@/state/ledger-store';

/** Rows of the statement list: open lines, then the fold, then settled history. */
type ListItem =
  | { kind: 'line'; line: StatementLine; key: string }
  | { kind: 'fold'; key: string }
  | { kind: 'history'; line: StatementLine; key: string };

const NOTICE_MS = 3000;

/** UPI deep links only open an app on a phone; browsers have nothing to hand them to. */
const CAN_OPEN_UPI = Platform.OS !== 'web';

export default function LedgerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const { accounts, entries } = useLedger();
  const account = useAccount(id);
  const profile = useProfile();
  const { addEntry } = useLedgerActions();
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // A UPI payment happens in another app. When the person comes back, ask
  // whether it went through — only they can see the UPI app's result.
  const [upiAmount, setUpiAmount] = useState<Money | null>(null);
  const [isAskingIfPaid, setAskingIfPaid] = useState(false);

  useEffect(() => {
    if (upiAmount === null) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setAskingIfPaid(true);
      }
    });
    return () => subscription.remove();
  }, [upiAmount]);

  useEffect(() => {
    if (notice === null) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const accountNames = useMemo(
    () => new Map(accounts.map((item) => [item.id, item.name])),
    [accounts],
  );

  const balance = useMemo(() => (id ? balanceOf(id, entries) : 0), [entries, id]);
  const statement = useMemo(() => (id ? buildStatement(id, entries) : []), [entries, id]);
  const periods = useMemo(() => splitAtLastSettlement(statement), [statement]);

  // Settled business folds away; it stays one tap from view.
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = periods.open.map((line, index) => ({
      kind: 'line',
      line,
      key: `${line.entry.id}-${index}`,
    }));
    if (periods.settled.length > 0) {
      items.push({ kind: 'fold', key: 'fold' });
      if (isHistoryOpen) {
        periods.settled.forEach((line, index) =>
          items.push({ kind: 'history', line, key: `h-${line.entry.id}-${index}` }),
        );
      }
    }
    return items;
  }, [isHistoryOpen, periods]);
  const sharedSummary = useMemo(
    () => (id ? summariseSharedLedger(id, entries) : null),
    [entries, id],
  );
  const accountById = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);

  if (!account) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ledger' }} />
        <EmptyState
          glyph="🔍"
          title="Ledger not found"
          message="It may have been deleted."
          actionLabel="Back to ledgers"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  const summary =
    account.role === 'party'
      ? describePartyBalance(balance)
      : describeAccountBalance(account, balance);

  const toneColor =
    summary.tone === 'positive'
      ? theme.positive
      : summary.tone === 'negative'
        ? theme.negative
        : theme.text;

  const isCompact = width < WIDE_STATEMENT_BREAKPOINT;
  const isExpenseLedger = account.role === 'category' && account.type === 'expense';
  const splitGroup = account.splitGroup;

  const isParty = account.role === 'party';
  const canSettle = isParty && balance !== 0;

  const recordEntry = (direction: SimpleDirection) =>
    router.push(`/entry/new?ledgerId=${account.id}&direction=${direction}`);

  // You owe them: their UPI ID lets you pay from here.
  const youOwe = isParty && balance < 0;
  const owedToYou = isParty && balance > 0;

  const payWithUpi = async () => {
    if (!account.upiId) {
      router.push(`/ledger/edit?id=${account.id}`);
      return;
    }
    const amount = -balance;
    setUpiAmount(amount);
    try {
      await Linking.openURL(
        buildUpiLink({
          payeeUpiId: account.upiId,
          payeeName: account.name,
          amount,
          note: profile.name ? `From ${profile.name}` : 'Settling our account',
        }),
      );
    } catch {
      setUpiAmount(null);
      setNotice('No UPI app found on this phone.');
    }
  };

  const finishUpiPayment = (didPay: boolean) => {
    setAskingIfPaid(false);
    const amount = upiAmount;
    setUpiAmount(null);
    if (!didPay || amount === null) {
      return;
    }
    // Recorded against Bank: UPI money leaves your bank account.
    const settlement = buildSettlement(account.id, BANK_ACCOUNT_ID, balance, amount);
    if (settlement) {
      addEntry({ narration: 'Paid by UPI', postings: settlement.postings });
      setNotice(`Recorded ${formatMoney(amount)} paid to ${account.name}.`);
    }
  };

  const share = () => router.push(`/ledger/share?id=${account.id}`);

  const renderLine = (line: StatementLine, index: number, isHistory: boolean) => (
    <Animated.View entering={rowIn(index)} layout={settle}>
      {/* Dimmed on an inner view: Reanimated owns opacity on the animated one. */}
      <View style={isHistory && styles.historyLine}>
        <StatementRow
          line={line}
          compact={isCompact}
          contraNames={line.contraAccountIds.map(
            (contraId) => accountNames.get(contraId) ?? 'Deleted ledger',
          )}
          onPress={() => router.push(`/entry/${line.entry.id}`)}
          onLongPress={() => router.push(`/entry/new?editId=${line.entry.id}`)}
        />
      </View>
    </Animated.View>
  );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit ledger"
              onPress={() => router.push(`/ledger/edit?id=${account.id}`)}
              hitSlop={12}
              style={styles.headerAction}>
              <ThemedText type="smallBold">Edit</ThemedText>
            </Pressable>
          ),
        }}
      />

      <Animated.View entering={riseIn(0, 6)} style={styles.hero}>
        {/* The header carries the name; this row adds who to call. */}
        {account.phone ? (
          <View style={styles.heroIdentity}>
            <Avatar name={account.name} hue={account.hue} size={32} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroText}>
              {account.phone}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.heroBalance}>
          <ThemedText type="small" style={{ color: toneColor }}>
            {summary.label}
          </ThemedText>
          <AnimatedMoney
            value={summary.amount}
            face="display"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.heroAmount, { color: toneColor }]}
          />
          <DoubleRule color={toneColor} delay={320} style={styles.heroRule} />
        </View>

        <View style={styles.heroActions}>
          {youOwe && CAN_OPEN_UPI ? (
            <Button
              label={account.upiId ? `Pay ${formatMoney(-balance)} by UPI` : 'Add UPI ID to pay'}
              size="small"
              variant={account.upiId ? 'negative' : 'ghost'}
              onPress={payWithUpi}
            />
          ) : null}
          {canSettle ? (
            <Button
              label="Settle up"
              size="small"
              onPress={() => router.push(`/ledger/settle?id=${account.id}`)}
            />
          ) : null}
          <Button
            label={owedToYou ? 'Ask to pay' : 'Share'}
            size="small"
            variant="ghost"
            onPress={share}
          />
          {owedToYou && !profile.upiId ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/settings')}
              style={styles.notice}>
              <ThemedText type="small" themeColor="textSecondary">
                <ThemedText type="link">Add your UPI ID</ThemedText> so they can pay you in one tap.
              </ThemedText>
            </Pressable>
          ) : null}
          {notice ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              accessibilityLiveRegion="polite"
              style={styles.notice}>
              {notice}
            </ThemedText>
          ) : null}
        </View>
      </Animated.View>

      {isExpenseLedger && splitGroup && sharedSummary ? (
        <View style={styles.sharedCard}>
          <SplitGroupCard
            group={splitGroup}
            summary={sharedSummary}
            accountById={accountById}
            onEdit={() => router.push(`/ledger/split-group?id=${account.id}`)}
          />
        </View>
      ) : null}

      <FlatList
        data={listItems}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          periods.open.length > 0 ? (
            <StatementHeader compact={isCompact} />
          ) : periods.settled.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.clean}>
              {isParty
                ? `All square with ${account.name}. New entries start a fresh page.`
                : 'Nothing new since the balance last came to zero.'}
            </ThemedText>
          ) : null
        }
        renderItem={({ item, index }) => {
          if (item.kind === 'fold') {
            const count = periods.settled.length;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isHistoryOpen }}
                onPress={() => setHistoryOpen((open) => !open)}
                style={[styles.fold, { borderBottomColor: theme.border }]}>
                <View style={styles.foldText}>
                  <ThemedText type="smallBold">Settled history</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {count} {count === 1 ? 'entry' : 'entries'}, cleared{' '}
                    {periods.settledOn ? formatDateShort(periods.settledOn) : ''}
                  </ThemedText>
                </View>
                <ThemedText type="link">{isHistoryOpen ? 'Hide' : 'Show'}</ThemedText>
              </Pressable>
            );
          }
          return renderLine(item.line, index, item.kind === 'history');
        }}
        ListEmptyComponent={
          <EmptyState
            glyph={isExpenseLedger ? '🧾' : '🧮'}
            title="Nothing recorded yet"
            message={
              isExpenseLedger
                ? `Record a ${account.name} bill and split it with the people who share it.`
                : `Use the buttons below to record what you gave to or got from ${account.name}.`
            }
          />
        }
      />

      <Animated.View
        entering={fadeIn(200)}
        style={[
          styles.actionBar,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}>
        {isExpenseLedger ? (
          <>
            <Button
              label={splitGroup ? 'Record split expense' : 'Record expense'}
              onPress={() => router.push(`/entry/split?ledgerId=${account.id}`)}
              style={styles.actionButton}
            />
            {splitGroup ? null : (
              <Button
                label="Split with people"
                variant="secondary"
                onPress={() => router.push(`/ledger/split-group?id=${account.id}`)}
                style={styles.actionButton}
              />
            )}
          </>
        ) : (
          <>
            <Button
              label="You gave"
              variant="negative"
              onPress={() => recordEntry('gave')}
              style={styles.actionButton}
            />
            <Button
              label="You got"
              variant="positive"
              onPress={() => recordEntry('got')}
              style={styles.actionButton}
            />
          </>
        )}
      </Animated.View>

      <ConfirmDialog
        visible={isAskingIfPaid}
        title={`Did you pay ${account.name}?`}
        message={`If your UPI app showed ${upiAmount !== null ? formatMoney(upiAmount) : 'the payment'} as successful, record it here. It is entered as paid from Bank.`}
        confirmLabel="Yes, record it"
        cancelLabel="No"
        onConfirm={() => finishUpiPayment(true)}
        onCancel={() => finishUpiPayment(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    // The web header places this flush against the viewport edge.
    paddingHorizontal: Spacing.three,
  },
  hero: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroBalance: {
    gap: Spacing.one,
  },
  heroRule: {
    width: '62%',
    maxWidth: 280,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  notice: {
    flexBasis: '100%',
  },
  clean: {
    paddingBottom: Spacing.three,
  },
  fold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  foldText: {
    flex: 1,
  },
  /** Closed business reads quieter than what is still open. */
  historyLine: {
    opacity: 0.6,
  },
  sharedCard: {
    paddingTop: Spacing.three,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroAmount: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  listContent: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    flexGrow: 1,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
  },
});
