import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../theme/colors';
import { WithdrawalRecord } from '../../store/useStore';
import { withdrawalsApi } from '../../services/api';
import { CoinPEMotif, SparkleMotif } from '../../components/JuvMotifs';
import { JuvShapes } from '../../components/JuvShapes';

interface Props {
  navigation: any;
}

const STATUS_CONFIG: Record<WithdrawalRecord['status'], { color: string; label: string }> = {
  completado: { color: '#34D399', label: 'Listo' },
  pendiente:  { color: '#FACC15', label: 'En curso' },
  rechazado:  { color: '#F87171', label: 'Fallido' },
};

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    setLoading(true);
    setError('');
    withdrawalsApi
      .list()
      .then((res) => {
        setWithdrawals(res.data.data || []);
      })
      .catch(() => {
        setError('No se pudo cargar el historial.');
      })
      .finally(() => setLoading(false));
  };

  const completed = withdrawals.filter((w) => w.status === 'completado');
  const total = completed.reduce((sum, w) => sum + w.amount, 0);

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientMid, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.5} seed={0} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.yellow} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchHistory} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Summary card */}
          <LinearGradient
            colors={[Colors.yellow, Colors.yellowDark]}
            style={styles.summaryCard}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summarySparkle}>
              <SparkleMotif size={80} color="#1F0A2E" />
            </View>
            <CoinPEMotif size={44} />
            <View style={styles.summaryCenter}>
              <Text style={styles.summaryLabel}>RETIRADO TOTAL</Text>
              <Text style={styles.summaryAmount}>S/{total.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryCount}>{withdrawals.length}</Text>
              <Text style={styles.summaryCountLabel}>operaciones</Text>
            </View>
          </LinearGradient>

          {withdrawals.length === 0 && (
            <Text style={styles.emptyText}>No tienes retiros aún.</Text>
          )}

          <View style={styles.list}>
            {withdrawals.map((withdrawal) => {
              const cfg = STATUS_CONFIG[withdrawal.status] || { color: Colors.white, label: withdrawal.status };
              const isFailed = withdrawal.status === 'rechazado';
              return (
                <View key={withdrawal.id} style={styles.row}>
                  <View style={[styles.statusDot, {
                    backgroundColor: cfg.color,
                    shadowColor: cfg.color,
                  }]} />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowMethod} numberOfLines={1}>
                      {withdrawal.method}
                    </Text>
                    <Text style={styles.rowDate}>{withdrawal.date}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[
                      styles.rowAmount,
                      isFailed && styles.rowAmountFailed,
                    ]}>
                      S/{withdrawal.amount}
                    </Text>
                    <Text style={[styles.rowStatus, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 16,
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  headerTitle: {
    flex: 1,
    color: Colors.white,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    color: Colors.red,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: Colors.textOnYellow,
    fontSize: 15,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 18,
  },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  summarySparkle: {
    position: 'absolute',
    right: -12,
    top: -12,
    opacity: 0.25,
  },
  summaryCenter: {
    flex: 1,
  },
  summaryLabel: {
    color: '#1F0A2E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    opacity: 0.7,
  },
  summaryAmount: {
    color: '#1F0A2E',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryCount: {
    color: '#1F0A2E',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryCountLabel: {
    color: '#1F0A2E',
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.7,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 40,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowMethod: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  rowDate: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    color: Colors.yellow,
    fontSize: 16,
    fontWeight: '900',
  },
  rowAmountFailed: {
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  rowStatus: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
});
