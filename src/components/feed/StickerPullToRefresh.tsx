import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TRIGGER_DISTANCE = 92;
const PATH_LENGTH = 178;
const STICKER_OUTLINE_PATH =
  "M16 6H40L54 20V52C54 55.3 51.3 58 48 58H16C12.7 58 10 55.3 10 52V12C10 8.7 12.7 6 16 6Z";
const STICKER_FOLD_PATH = "M40 6V16C40 18.2 41.8 20 44 20H54L40 6Z";

export type StickerPullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
  accentColor?: string;
  size?: number;
  pullDistance: number;
};

export function StickerPullToRefresh({
  refreshing,
  onRefresh: _onRefresh,
  accentColor = "#20D25C",
  size = 48,
  pullDistance,
}: StickerPullToRefreshProps) {
  const pullProgress = useMemo(() => {
    const raw = pullDistance / TRIGGER_DISTANCE;
    return Math.max(0, Math.min(1, raw));
  }, [pullDistance]);

  const dashLoop = useSharedValue(0);
  const drawProgress = useSharedValue(pullProgress);
  const alpha = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    drawProgress.value = withTiming(pullProgress, { duration: 90, easing: Easing.out(Easing.cubic) });
    if (!refreshing) {
      alpha.value = withTiming(pullProgress > 0.01 ? 1 : 0, { duration: pullProgress > 0.01 ? 80 : 220 });
      scale.value = withTiming(pullProgress >= 0.98 ? 1.03 : 0.94 + pullProgress * 0.06, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [alpha, drawProgress, pullProgress, refreshing, scale]);

  useEffect(() => {
    if (refreshing) {
      alpha.value = withTiming(1, { duration: 120 });
      scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
      drawProgress.value = withTiming(1, { duration: 130, easing: Easing.out(Easing.cubic) });
      dashLoop.value = 0;
      dashLoop.value = withRepeat(
        withTiming(1, {
          duration: 1180,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      return;
    }

    cancelAnimation(dashLoop);
    dashLoop.value = 0;
    if (pullProgress <= 0.01) {
      alpha.value = withTiming(0, { duration: 240 });
      scale.value = withTiming(0.94, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
  }, [alpha, dashLoop, drawProgress, pullProgress, refreshing, scale]);

  const animatedOutlineProps = useAnimatedProps(() => {
    const currentDraw = refreshing ? 1 : drawProgress.value;
    const baseOffset = PATH_LENGTH * (1 - currentDraw);
    const loopShift = refreshing ? dashLoop.value * PATH_LENGTH : 0;
    return {
      strokeDasharray: [PATH_LENGTH, PATH_LENGTH],
      strokeDashoffset: baseOffset - loopShift,
    };
  });

  const animatedWrapStyle = useAnimatedStyle(() => ({
    opacity: alpha.value,
    transform: [{ scale: scale.value }, { translateY: refreshing ? 0 : -2 + drawProgress.value * 2 }],
  }));

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View style={[styles.loaderShell, animatedWrapStyle]}>
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <G>
            <Path d={STICKER_OUTLINE_PATH} fill="rgba(255,255,255,0.12)" />
            <Path d={STICKER_FOLD_PATH} fill="rgba(255,255,255,0.28)" />
            <Path
              d={STICKER_OUTLINE_PATH}
              stroke="rgba(31,41,55,0.34)"
              strokeWidth={3.4}
              strokeLinejoin="round"
            />
            <AnimatedPath
              animatedProps={animatedOutlineProps}
              d={STICKER_OUTLINE_PATH}
              stroke={accentColor}
              strokeWidth={3.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

export const STICKER_PULL_REFRESH_TRIGGER = TRIGGER_DISTANCE;

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9,
  },
  loaderShell: {
    borderRadius: 999,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
});
