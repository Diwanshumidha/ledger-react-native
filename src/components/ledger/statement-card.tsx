import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatDateLong, today } from '@/domain/date';
import { formatMoney, type Money } from '@/domain/money';
import { describeSharedBalance, sharedLines } from '@/domain/share-text';
import type { Account, Profile, StatementLine } from '@/domain/types';

/** Fixed width so the saved image is the same on every phone. */
export const STATEMENT_CARD_WIDTH = 360;
const QR_SIZE = 128;

/**
 * Always the light paper palette: the image is sent to someone else, so it
 * should look the same whatever theme the sender's phone is in.
 */
const ink = Colors.light;

export interface StatementCardProps {
  account: Account;
  balance: Money;
  /** Newest first; usually only the lines since the last settlement. */
  statement: StatementLine[];
  profile: Profile;
  /** `upi://pay` link for the QR code; omitted when there is nothing to pay you. */
  upiLink: string | null;
}

/**
 * The statement as a picture — the shareable counterpart of the ledger page.
 * The closing balance is ruled off the same way, and when they owe you, a
 * UPI QR code lets them pay by scanning it.
 */
export const StatementCard = forwardRef<View, StatementCardProps>(function StatementCard(
  { account, balance, statement, profile, upiLink },
  ref,
) {
  const owedToYou = account.role === 'party' && balance > 0;
  const tone = balance === 0 ? ink.text : owedToYou ? ink.positive : ink.negative;
  const { lines, hidden } = sharedLines(account, statement);

  return (
    // `collapsable={false}` keeps this a real native view so it can be captured.
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.masthead}>
        <ThemedText type="heading" style={[styles.wordmark, { color: ink.text }]}>
          Ledger
        </ThemedText>
        <ThemedText type="caption" style={{ color: ink.textSecondary }}>
          {formatDateLong(today())}
        </ThemedText>
      </View>
      <View style={[styles.rule, { backgroundColor: ink.text }]} />

      <View style={styles.party}>
        <ThemedText type="small" style={{ color: ink.textSecondary }}>
          {account.role === 'party' ? 'Our account' : 'Ledger'}
        </ThemedText>
        <ThemedText type="heading" style={[styles.partyName, { color: ink.text }]}>
          {account.name}
        </ThemedText>
      </View>

      <View style={styles.balance}>
        <ThemedText type="heading" style={[styles.balanceText, { color: tone }]}>
          {describeSharedBalance(account, balance)}
        </ThemedText>
        <View style={styles.doubleRule}>
          <View style={[styles.doubleLine, { backgroundColor: tone }]} />
          <View style={[styles.doubleLine, { backgroundColor: tone }]} />
        </View>
      </View>

      {lines.length > 0 ? (
        <View style={styles.entries}>
          {lines.map((line, index) => (
            <View
              key={`${line.date}-${index}`}
              style={[styles.entry, { borderBottomColor: ink.border }]}>
              <ThemedText type="caption" style={[styles.entryDate, { color: ink.textSecondary }]}>
                {line.date}
              </ThemedText>
              <ThemedText
                type="small"
                numberOfLines={1}
                style={[styles.entryNote, { color: ink.text }]}>
                {line.note ?? (line.isOutgoing ? 'Given' : 'Received')}
              </ThemedText>
              <ThemedText
                type="figure"
                style={[
                  styles.entryAmount,
                  { color: line.isOutgoing ? ink.negative : ink.positive },
                ]}>
                {line.what}
              </ThemedText>
            </View>
          ))}
          {hidden > 0 ? (
            <ThemedText type="caption" style={[styles.hidden, { color: ink.textSecondary }]}>
              {hidden} earlier {hidden === 1 ? 'entry' : 'entries'} not shown
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {upiLink && owedToYou ? (
        // The last entry's rule already separates this when there are entries.
        <View
          style={[
            styles.pay,
            lines.length === 0 && { borderTopWidth: 1, borderColor: ink.border },
          ]}>
          <View style={styles.qr}>
            <QRCode value={upiLink} size={QR_SIZE} color={ink.text} backgroundColor="#FFFFFF" />
          </View>
          <View style={styles.payText}>
            <ThemedText type="heading" style={[styles.payTitle, { color: ink.text }]}>
              Scan to pay {formatMoney(balance)}
            </ThemedText>
            <ThemedText type="small" style={{ color: ink.textSecondary }}>
              Opens in GPay, PhonePe, Paytm or any UPI app.
            </ThemedText>
            <ThemedText type="smallBold" style={[styles.upiId, { color: ink.text }]}>
              {profile.upiId}
            </ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: STATEMENT_CARD_WIDTH,
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: ink.card,
    borderRadius: Radius.large,
  },
  masthead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  wordmark: {
    fontSize: 18,
  },
  rule: {
    height: 1,
    marginTop: -Spacing.two,
  },
  party: {
    gap: 0,
  },
  partyName: {
    fontSize: 24,
    lineHeight: 30,
  },
  balance: {
    gap: Spacing.two,
  },
  balanceText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  doubleRule: {
    gap: 2,
    width: '70%',
  },
  doubleLine: {
    height: 1.5,
  },
  entries: {
    gap: 0,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryDate: {
    width: 44,
  },
  entryNote: {
    flex: 1,
    minWidth: 0,
  },
  entryAmount: {
    fontSize: 13,
  },
  hidden: {
    paddingTop: Spacing.two,
  },
  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  qr: {
    padding: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.medium,
  },
  payText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  payTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  upiId: {
    paddingTop: Spacing.one,
  },
});
