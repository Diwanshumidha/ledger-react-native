import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  LedgerRowContent,
  ledgerRowLabel,
  type LedgerRowProps,
} from '@/components/ledger/ledger-row';
import { ThemedText } from '@/components/themed-text';
import { Duration, Ease, TimingBase } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/utils/haptics';

const ACTION_WIDTH = 88;
/** Movement under this (points) still counts as a tap. */
const TAP_SLOP = 8;
/** How far past fully open the row may be dragged, resisting as it goes. */
const OVERDRAG = 24;
/** A flick at least this fast (points per ms) opens or closes regardless of distance. */
const FLICK_VELOCITY = 0.3;

export interface SwipeAction {
  label: string;
  tone: 'positive' | 'negative' | 'ink';
  onPress: () => void;
}

/** What the list holds on to so it can close a row when another opens. */
export interface SwipeRowHandle {
  close(): void;
}

export interface SwipeableLedgerRowProps extends LedgerRowProps {
  /** Revealed by swiping the row to the left, nearest the row first. */
  actions: SwipeAction[];
  /** Lets the list keep only one row open at a time. */
  onOpen: (row: SwipeRowHandle) => void;
}

/**
 * A ledger row that swipes left to reveal quick-record actions.
 *
 * One responder owns the whole touch and decides on release what it was: a
 * tap opens the ledger, a sideways drag swipes. There is deliberately no
 * Pressable inside — handing a touch from a press target to a swipe midway
 * is what failed on Android, where the press kept it and fired on release.
 * Vertical drags are handed to the list so it still scrolls.
 */
export function SwipeableLedgerRow({ actions, onOpen, ...rowProps }: SwipeableLedgerRowProps) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const pressed = useSharedValue(0);
  const openWidth = ACTION_WIDTH * actions.length;

  const isOpen = useRef(false);
  const isSwiping = useRef(false);
  const dragStart = useRef(0);

  // The responder is created once; it reads the latest props through this.
  const latest = useRef({ openWidth, onOpen, onPress: rowProps.onPress });
  useEffect(() => {
    latest.current = { openWidth, onOpen, onPress: rowProps.onPress };
  }, [onOpen, openWidth, rowProps.onPress]);

  const [handle] = useState<SwipeRowHandle>(() => ({
    close: () => {
      isOpen.current = false;
      translateX.value = withTiming(0, TimingBase);
    },
  }));

  // The refs are only read inside the responder's callbacks, which run on
  // touch events — never during render — so the compiler's warning is moot.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const release = () => {
      pressed.value = withTiming(0, { duration: Duration.base, easing: Ease });
    };

    const settleTo = (open: boolean) => {
      const wasOpen = isOpen.current;
      isOpen.current = open;
      translateX.value = withTiming(open ? -latest.current.openWidth : 0, TimingBase);
      if (open) {
        // Felt only when a swipe actually opens, not on every drag.
        if (!wasOpen) {
          tick();
        }
        latest.current.onOpen(handle);
      }
    };

    const tap = () => {
      // Tapping a row that is swiped open just closes it.
      if (isOpen.current) {
        handle.close();
      } else {
        latest.current.onPress();
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isSwiping.current = false;
        dragStart.current = isOpen.current ? -latest.current.openWidth : 0;
        pressed.value = withTiming(1, { duration: 120, easing: Ease });
      },
      onPanResponderMove: (_, gesture) => {
        if (!isSwiping.current) {
          // Commit to a swipe only once the drag is clearly sideways.
          if (Math.abs(gesture.dx) < TAP_SLOP || Math.abs(gesture.dx) < Math.abs(gesture.dy)) {
            return;
          }
          isSwiping.current = true;
          release();
        }
        const width = latest.current.openWidth;
        const next = dragStart.current + gesture.dx;
        // Past fully open the row resists, so the end of travel is felt.
        const resisted = next < -width ? -width + (next + width) * 0.3 : next;
        translateX.value = Math.min(0, Math.max(-width - OVERDRAG, resisted));
      },
      onPanResponderRelease: (_, gesture) => {
        release();
        if (!isSwiping.current) {
          if (Math.abs(gesture.dx) < TAP_SLOP && Math.abs(gesture.dy) < TAP_SLOP) {
            tap();
          }
          return;
        }
        const position = dragStart.current + gesture.dx;
        if (gesture.vx < -FLICK_VELOCITY) {
          settleTo(true);
        } else if (gesture.vx > FLICK_VELOCITY) {
          settleTo(false);
        } else {
          settleTo(position < -latest.current.openWidth / 2);
        }
      },
      // The list took the touch to scroll: no tap, and the row stays put.
      onPanResponderTerminate: () => {
        release();
        if (isSwiping.current) {
          settleTo(isOpen.current);
        }
      },
      // Until it is a swipe, let the list claim a vertical drag.
      onPanResponderTerminationRequest: () => !isSwiping.current,
    });
  });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.25,
  }));

  const background = {
    positive: theme.positive,
    negative: theme.negative,
    ink: theme.accent,
  };

  const runAction = (action: SwipeAction) => {
    handle.close();
    action.onPress();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.actions, { width: openWidth }]}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${rowProps.account.name}`}
            onPress={() => runAction(action)}
            style={({ pressed: isPressed }) => [
              styles.action,
              { backgroundColor: background[action.tone], opacity: isPressed ? 0.8 : 1 },
            ]}>
            <ThemedText type="smallBold" style={[styles.actionLabel, { color: theme.onAccent }]}>
              {action.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Opaque so the actions stay hidden until the row moves aside. */}
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={ledgerRowLabel(rowProps.account, rowProps.balance)}
        accessibilityHint="Swipe left to record an entry"
        accessibilityActions={[
          { name: 'activate' },
          ...actions.map((action) => ({ name: action.label, label: action.label })),
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') {
            rowProps.onPress();
            return;
          }
          const action = actions.find((item) => item.label === event.nativeEvent.actionName);
          if (action) {
            runAction(action);
          }
        }}
        style={[rowStyle, styles.row, { backgroundColor: theme.background }]}>
        <Animated.View style={pressStyle}>
          <LedgerRowContent
            account={rowProps.account}
            balance={rowProps.balance}
            lastActivityDate={rowProps.lastActivityDate}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  /**
   * On web a mouse drag over the name would start selecting text, and the
   * browser's selection change cancels the swipe mid-drag.
   */
  row: {
    userSelect: 'none',
  },
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  actionLabel: {
    textAlign: 'center',
  },
});
