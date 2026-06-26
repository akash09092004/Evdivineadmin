import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function LinearGradient({ colors = ['#000', '#000'], style, children }) {
  const [startColor = '#000', endColor = startColor] = colors;

  return (
    <View style={[styles.container, { backgroundColor: startColor }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            backgroundColor: endColor,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            backgroundColor: 'rgba(255,255,255,0.12)',
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.32,
    transform: [{ scaleX: 1.25 }, { scaleY: 1.1 }, { rotate: '-10deg' }],
    borderRadius: 999,
  },
  highlight: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
});
