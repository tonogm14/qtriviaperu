import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface JuvBadgeProps {
  label: string;
  color: string;
}

export const JuvBadge: React.FC<JuvBadgeProps> = ({ label, color }) => (
  <View
    style={[
      styles.badge,
      {
        backgroundColor: `${color}25`,
        borderColor: color,
      },
    ]}
  >
    <Text style={[styles.text, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
});
