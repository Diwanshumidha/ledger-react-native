import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the surface sinks while held. */
  scaleTo?: number;
  dimTo?: number;
}

/**
 * A press target that springs inward on touch. Used for every tappable card so
 * the whole app shares one tactile language.
 */
export function PressableScale({
  style,
  scaleTo = 0.97,
  dimTo = 0.92,
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
        progress.value = withTiming(1, { duration: 90 });
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = withSpring(0, PRESS_SPRING);
        rest.onPressOut?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
