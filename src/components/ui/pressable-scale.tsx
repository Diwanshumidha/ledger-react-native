import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Duration, Ease } from '@/constants/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the surface sinks while held. */
  scaleTo?: number;
  dimTo?: number;
}

/**
 * A press target that eases down slightly on touch and back on release. Used
 * for every tappable surface so the whole app shares one quiet press response.
 */
export function PressableScale({
  style,
  scaleTo = 0.985,
  dimTo = 0.78,
  children,
  ...rest
}: PressableScaleProps) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - progress.value * (1 - scaleTo) }],
    opacity: 1 - progress.value * (1 - dimTo),
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        progress.value = withTiming(1, { duration: 120, easing: Ease });
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = withTiming(0, { duration: Duration.base, easing: Ease });
        rest.onPressOut?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
