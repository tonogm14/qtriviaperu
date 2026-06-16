import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { shopApi } from '../../services/api';

interface Props {
  navigation: any;
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface MerchGroupItem {
  orderId: string;
  name: string;
  emoji: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface MerchGroup {
  id: string;
  orderNumber: number | null;
  cartRef: string | null;
  items: MerchGroupItem[];
  totalAmount: number;
  method: string;
  status: OrderStatus;
  address: string | null;
  phone: string | null;
  recipientName: string | null;
  dni: string | null;
  notes: string | null;
  createdAt: string;
}

function fmtOrderNum(n: number | null): string {
  if (!n) return '—';
  return `B01-${n.toString().padStart(7, '0')}`;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; emoji: string }> = {
  PENDING:   { label: 'Pendiente',  color: '#FBBF24', emoji: '⏳' },
  CONFIRMED: { label: 'Confirmado', color: '#60A5FA', emoji: '✅' },
  SHIPPED:   { label: 'En camino',  color: '#A855F7', emoji: '📦' },
  DELIVERED: { label: 'Entregado',  color: '#34D399', emoji: '🎉' },
  CANCELLED: { label: 'Cancelado',  color: '#EF4444', emoji: '❌' },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
      <Text style={[badge.text, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
    </View>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const MyOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const [orders, setOrders] = useState<MerchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await shopApi.myOrders();
      const { merch } = res.data.data;
      const sorted = [...merch].sort((a: MerchGroup, b: MerchGroup) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sorted);
      setError('');
    } catch {
      setError('No se pudo cargar tus pedidos.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.5} seed={7} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 52 }}>📦</Text>
          <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
          <Text style={styles.emptySub}>Agrega productos al carrito para comenzar</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.retryText}>Ir a la tienda →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="rgba(255,255,255,0.4)" />}
        >
          {orders.map((o) => {
            const emojis = o.items.slice(0, 3).map(i => i.emoji).join(' ');
            const extraCount = o.items.length - 3;
            const itemNames = o.items.map(i => `${i.quantity}× ${i.name}`).join(', ');
            return (
              <TouchableOpacity
                key={o.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('OrderDetail', { order: o })}
              >
                <View style={styles.orderIdRow}>
                  <Text style={styles.orderId}>{fmtOrderNum(o.orderNumber)}</Text>
                  <Text style={styles.cardDate}>{formatDate(o.createdAt)}</Text>
                </View>

                <View style={styles.cardTop}>
                  <Text style={styles.cardEmojis}>{emojis}{extraCount > 0 ? ` +${extraCount}` : ''}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={2}>{itemNames}</Text>
                    <Text style={styles.cardMeta}>
                      {o.items.length} {o.items.length === 1 ? 'producto' : 'productos'} · {o.method.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.cardTotal}>S/{o.totalAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.cardBottom}>
                  <StatusBadge status={o.status} />
                  <Text style={styles.tapHint}>Ver detalle →</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
};

const badge = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: 'white', fontSize: 22, fontWeight: '800', lineHeight: 24 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  errorText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginTop: 8 },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  retryText: { color: 'white', fontSize: 13, fontWeight: '700' },

  scroll: { paddingHorizontal: 18, paddingTop: 4 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10,
  },

  orderIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: 'rgba(168,85,247,0.9)', fontSize: 11, fontWeight: '900', letterSpacing: 1, fontFamily: 'monospace' },
  cardDate: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmojis: { fontSize: 28, flexShrink: 0 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  cardMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  cardTotal: { color: '#FACC15', fontSize: 17, fontWeight: '900', flexShrink: 0 },

  cardBottom: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  tapHint: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700' },
});
