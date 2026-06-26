import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from './LinearGradient';
import { Colors } from '../theme/colors';

export default function GradientButton({
  title,
  onPress,
  loading = false,
  style,
  textStyle,
  outline = false,
}) {
  if (outline) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.outlineBtn, style]}
        activeOpacity={0.8}
      >
        <Text style={[styles.outlineText, textStyle]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  outlineText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
