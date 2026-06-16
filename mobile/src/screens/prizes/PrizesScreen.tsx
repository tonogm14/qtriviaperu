import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { prizesApi } from '../../services/api';

interface Props {
  navigation: any;
}

type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'REJECTED';

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING:    'Pendiente',
  PROCESSING: 'En Proceso',
  DONE:       'Entregado',
  REJECTED:   'No aplicó',
};

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  PENDING:    '#FACC15',
  PROCESSING: '#A855F7',
  DONE:       '#34D399',
  REJECTED:   'rgba(255,255,255,0.3)',
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export const PrizesScreen: React.FC<Props> = ({ navigation }) => {
  const [prizes, setPrizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prizesApi.list()
      .then((r) => setPrizes(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const delivered = prizes.filter((p) => p.status === 'DONE');
  const totalValue = delivered.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

  return (
    <LinearGradient colors={['#4C1D95', '#3B0764']} style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Premios</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{delivered.length}</Text>
            <Text style={styles.summaryLabel}>Premios{'\n'}Ganados</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardGold]}>
            <Text style={[styles.summaryValue, { color: '#1F0A2E' }]}>
              S/{totalValue.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#1F0A2E' }]}>Valor{'\n'}Histórico</Text>
          </View>
        </View>

        {/* List */}
        <Text style={styles.sectionTitle}>HISTORIAL DE PREMIOS</Text>

        {loading && (
          <ActivityIndicator color="#FACC15" style={{ marginTop: 40 }} />
        )}

        {!loading && prizes.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>Aún no tienes premios</Text>
            <Text style={styles.emptySub}>Participa en las trivias para ganar</Text>
          </View>
        )}

        {!loading && prizes.map((p: any) => {
          const status = (p.status ?? 'PENDING') as DeliveryStatus;
          return (
            <View key={p.id} style={styles.prizeCard}>
              <View style={styles.prizeLeft}>
                <Text style={styles.prizeTrophy}>🏆</Text>
              </View>
              <View style={styles.prizeInfo}>
                <Text style={styles.prizeTitle}>{p.game?.title ?? 'Trivia QTrivia'}</Text>
                <Text style={styles.prizeAmount}>Premio: S/{(p.amount ?? 0).toFixed(2)}</Text>
                <Text style={styles.prizeDate}>Fecha: {fmt(p.createdAt)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[status]}22`, borderColor: STATUS_COLOR[status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>
                  {STATUS_LABEL[status]}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 80 },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  summaryCard: {
    flex: 1, padding: 20, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  summaryCardGold: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
  summaryValue: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -1 },
  summaryLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginTop: 4, letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.4)', marginBottom: 14,
  },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  prizeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  prizeLeft: { width: 36, alignItems: 'center' },
  prizeTrophy: { fontSize: 28 },
  prizeInfo: { flex: 1 },
  prizeTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  prizeAmount: { color: '#FACC15', fontSize: 13, fontWeight: '700' },
  prizeDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
