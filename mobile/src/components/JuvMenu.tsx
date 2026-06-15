import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface JuvMenuItemProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  badge?: string | number;
  onPress?: () => void;
}

export const JuvMenuItem: React.FC<JuvMenuItemProps> = ({
  icon,
  label,
  sub,
  badge,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

export const JuvMenuGroup: React.FC<{ children: React.ReactNode; title?: string }> = ({
  children,
  title,
}) => (
  <View style={styles.group}>
    {title && <Text style={styles.groupTitle}>{title}</Text>}
    {children}
  </View>
);

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    marginBottom: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
  },
  group: {
    marginBottom: 6,
  },
  groupTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
});
