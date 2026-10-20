import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { formatMoney, type Money } from '@/domain/money';

/** Long, soft tail: most of the distance early, the last digits settle slowly. */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Counts from the previous value to the next one on every change.
 *
 * This runs on the JS thread with `requestAnimationFrame` rather than on the
 * Reanimated worklet thread, because the value being animated is *text* — it
 * has to be re-formatted through `Intl` on each frame, which cannot happen in
 * a worklet. Transform and opacity animations elsewhere stay on the UI thread.
 */
export function useCountUp(value: Money): Money {
  const [displayed, setDisplayed] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      return;
    }
    if (reduceMotion) {
      // Callers show `value` directly; just keep the start point current.
      fromRef.current = to;
      return;
    }

    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / Duration.count);
      const eased = easeOutQuart(progress);
      const current = Math.round(from + (to - from) * eased);
      setDisplayed(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      // Land on the target so an interrupted run never leaves a stale figure.
      fromRef.current = to;
      setDisplayed(to);
    };
  }, [reduceMotion, value]);

  return reduceMotion ? value : displayed;
}

export interface AnimatedMoneyProps extends ThemedTextProps {
  value: Money;
  /** Skip the animation, e.g. in dense list rows. */
  animate?: boolean;
}

export function AnimatedMoney({ value, animate = true, ...rest }: AnimatedMoneyProps) {
  const animated = useCountUp(value);
  return (
    <ThemedText type="figure" {...rest}>
      {formatMoney(animate ? animated : value)}
    </ThemedText>
  );
}
