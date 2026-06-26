import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

export default function ResponsiveScreen({ children, backgroundColor }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <View style={[styles.outer, backgroundColor && { backgroundColor }]}>
      <View style={[styles.shell, isWide && styles.shellWide]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  shell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 560,
  },
  shellWide: {
    maxWidth: 1120,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
});
