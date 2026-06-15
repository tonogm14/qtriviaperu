import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { Colors } from '../../theme/colors';
import Svg, { Polyline } from 'react-native-svg';

interface Props {
  navigation: any;
  route: any;
}

export const WithdrawSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { amount, net, method, code } = route?.params || {
    amount: 80,
    net: 80,
    method: 'Yape',
    code: 'QT-2847-A',
  };

  const methodLabel =
    method === 'Yape' ? 'Yape'
    : method === 'Plin' ? 'Plin'
    : 'cuenta';

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientMid, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={1.2} seed={0} />

      <View style={styles.content}>
        {/* Check circle */}
        <LinearGradient
          colors={[Colors.yellow, Colors.yellowDark]}
          style={styles.checkCircle}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Svg width={48} height={48} viewBox="0 0 24 24">
            <Polyline
              points="20 6 9 17 4 12"
              fill="none"
              stroke={Colors.textOnYellow}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </LinearGradient>

        <Text style={styles.title}>¡Retiro enviado!</Text>
        <Text style={styles.subtitle}>
          S/{(net ?? amount).toFixed(2)} llegan a tu {methodLabel} en pocos minutos.
        </Text>

        {/* Code + Status card */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Código</Text>
            <Text style={styles.detailCode}>{code}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estado</Text>
            <Text style={styles.detailStatus}>● Procesando</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
          style={styles.historyLink}
        >
          <Text style={styles.historyLinkText}>Ver historial →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.85}
          style={styles.doneBtn}
        >
          <Text style={styles.doneBtnText}>Listo</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 12,
  },
  title: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  detailCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
    gap: 8,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  detailCode: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detailStatus: {
    color: Colors.yellow,
    fontSize: 13,
    fontWeight: '800',
  },
  historyLink: {
    marginBottom: 18,
  },
  historyLinkText: {
    color: Colors.yellow,
    fontSize: 14,
    fontWeight: '800',
  },
  doneBtn: {
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
