import React, { useRef, useEffect } from 'react';
import { View, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { useStealthNavigation } from './StealthNavigationWrapper';

interface EmergencyStealthGestureProps {
  children: React.ReactNode;
}

export const EmergencyStealthGesture: React.FC<EmergencyStealthGestureProps> = ({ children }) => {
  const { activateEmergencyStealth, isStealthModeActive } = useStealthNavigation();
  const gestureStartTime = useRef<number>(0);
  const gestureCount = useRef<number>(0);
  const gestureResetTimer = useRef<NodeJS.Timeout | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Emergency gesture pattern: Triple swipe from right edge within 2 seconds
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: event => {
      const { pageX } = event.nativeEvent;
      const isFromRightEdge = pageX > screenWidth - 20;

      if (isFromRightEdge) {
        const currentTime = Date.now();

        // Reset gesture count if too much time has passed
        if (currentTime - gestureStartTime.current > 2000) {
          gestureCount.current = 0;
        }

        gestureStartTime.current = currentTime;
      }
    },

    onPanResponderRelease: (event, gestureState) => {
      const { pageX } = event.nativeEvent;
      const { dx, dy } = gestureState;

      const isFromRightEdge = pageX > screenWidth - 20;
      const isLeftSwipe = dx < -100;
      const isHorizontal = Math.abs(dy) < 50;

      if (isFromRightEdge && isLeftSwipe && isHorizontal) {
        gestureCount.current += 1;

        // Clear any existing reset timer
        if (gestureResetTimer.current) {
          clearTimeout(gestureResetTimer.current);
        }

        // Activate emergency stealth on triple swipe
        if (gestureCount.current >= 3) {
          activateEmergencyStealth();
          gestureCount.current = 0;
          return;
        }

        // Reset gesture count after 2 seconds of inactivity
        gestureResetTimer.current = setTimeout(() => {
          gestureCount.current = 0;
        }, 2000);
      }
    },
  });

  useEffect(() => {
    return () => {
      if (gestureResetTimer.current) {
        clearTimeout(gestureResetTimer.current);
      }
    };
  }, []);

  // Don't intercept gestures if already in stealth mode
  if (isStealthModeActive) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
