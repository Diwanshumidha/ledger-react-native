import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

/**
 * One motion language for the whole app: unhurried ease-out timings, small
 * travel, no springs or overshoot. Layout animations follow the system
 * reduce-motion setting by default.
 */

/** A soft ease-out — starts moving at once, then settles slowly. */
export const Ease = Easing.bezier(0.22, 0.61, 0.36, 1);

export const Duration = {
  /** Press feedback and exits. */
  quick: 200,
  /** Controls changing state: toggles, chips, layout shifts. */
  base: 320,
  /** Content arriving on screen. */
  slow: 480,
  /** Figures counting to a new balance. */
  count: 900,
} as const;

export const TimingBase = { duration: Duration.base, easing: Ease };

/** Fade in while rising a few points into place. */
// On web, Reanimated treats any customised entrance (a `Keyframe`, or a preset
// with `withInitialValues`) as custom and pins the view `position: absolute`
// when it finishes, pulling it out of the layout. Web therefore gets the plain
// fade preset; native gets the short rise.
export function riseIn(delay = 0, distance = 8, duration: number = Duration.slow) {
  if (distance === 0 || Platform.OS === 'web') {
    return fadeIn(delay, duration);
  }
  return FadeInDown.duration(duration)
    .delay(delay)
    .easing(Ease)
    .withInitialValues({ opacity: 0, transform: [{ translateY: distance }] });
}

/** Plain fade, for surfaces that should not move (backdrops, summaries). */
export function fadeIn(delay = 0, duration: number = Duration.slow) {
  return FadeIn.duration(duration).delay(delay).easing(Ease);
}

export const fadeOut = FadeOut.duration(Duration.quick).easing(Ease);

/**
 * Entrance for the n-th row of a list. Only the first screenful cascades —
 * rows mounted later by scrolling arrive without waiting on a delay.
 */
export function rowIn(index: number) {
  const delay = index < 8 ? index * 40 : 0;
  return riseIn(delay, 6);
}

/** How rows slide when the list above them changes. */
export const settle = LinearTransition.duration(Duration.base).easing(Ease);
