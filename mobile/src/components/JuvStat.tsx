import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface JuvStatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  accentColor?: string;
  dark?: boolean;
}

export const JuvStat: React.FC<JuvStatProps> = ({
  label,
  value,
  sub,
  icon,
  accentColor = Colors.yellow,
  dark = false,
}) => (
  <View style={[styles.stat, dark && styles.statDark]}>
    {icon && <Text style={styles.icon}>{icon}</Text>}
    <Text style={[styles.value, { color: dark ? accentColor : Colors.dark }]}>{value}</Text>
    <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
    {sub && <Text style={[styles.sub, dark && styles.subDark]}>{sub}</Text>}
  </View>
);

interface JuvStatsCardProps {
  children: React.ReactNode;
  dark?: boolean;
}

export const JuvStatsCard: React.FC<JuvStatsCardProps> = ({ children, dark = false }) => (
  <View style={[styles.card, dark && styles.cardDark]}>
    <View style={styles.row}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardDark: {
    backgroundColor: Colors.cardBgSolid,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statDark: {},
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  label: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelDark: {
    color: 'rgba(255,255,255,0.5)',
  },
  sub: {
    color: Colors.dark,
    fontSize: 11,
    opacity: 0.5,
    marginTop: 1,
  },
  subDark: {
    color: 'rgba(255,255,255,0.4)',
  },
});
