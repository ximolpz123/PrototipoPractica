/**
 * SwipeableBottomSheet
 * Wrapper para modales tipo bottom-sheet que permite cerrarse al deslizar hacia abajo.
 * Uso:
 *   <Modal visible={...} transparent animationType="slide">
 *     <SwipeableBottomSheet onDismiss={() => setVisible(false)}>
 *       {children}
 *     </SwipeableBottomSheet>
 *   </Modal>
 */
import React, { useRef, ReactNode } from "react";
import {
  Animated,
  PanResponder,
  View,
  StyleSheet,
  Dimensions,
  StyleProp,
  ViewStyle,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 80;

interface Props {
  onDismiss: () => void;
  children: ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
  disableSwipe?: boolean;
}

export default function SwipeableBottomSheet({
  onDismiss,
  children,
  cardStyle,
  disableSwipe = false,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        !disableSwipe && gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_evt, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy >= DISMISS_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onDismiss();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[styles.card, cardStyle, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.indicator} />
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  indicator: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginBottom: 16,
  },
});
