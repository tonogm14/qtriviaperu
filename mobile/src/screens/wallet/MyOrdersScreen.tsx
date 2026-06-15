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

interface LifeOrder {
  id: string;
  orderNumber: number | null;
  packLabel: string;
  lives: number;
  quantity: number;
  price: number;
  method: string;
  createdAt: string;
}

interface VipEntry {
  id: string;
  orderNumber: number | null;
  gameId: string;
  joinedAt: string;
  game: { id: string; title: string; entryFee: number; scheduledAt: string };
}

function fmtOrderNum(n: number | null, prefix = 'B01'): string {
  if (!n) return '—';
  return `${prefix}-${n.toString().padStart(7, '0')}`;
}

type UnifiedEntry =
  | { type: 'merch'; order: MerchGroup; date: Date }
  | { type: 'life'; order: LifeOrder; date: Date }
  | { type: 'vip'; order: VipEntry; date: Date };

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
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'all' | 'merch' | 'life' | 'vip'>('all');

  const load = useCallback(async () => {
    try {
      const res = await shopApi.myOrders();
      const { merch, lives, vip } = res.data.data;
      const merged: UnifiedEntry[] = [
        ...merch.map((o: MerchGroup) => ({ type: 'merch' as const, order: o, date: new Date(o.createdAt) })),
        ...lives.map((o: LifeOrder) => ({ type: 'life' as const, order: o, date: new Date(o.createdAt) })),
        ...(vip ?? []).map((o: VipEntry) => ({ type: 'vip' as const, order: o, date: new Date(o.joinedAt) })),
      ];
      merged.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEntries(merged);
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

  const filtered = entries.filter((e) => tab === 'all' || e.type === tab);

  function fmtGameDate(dt: string) {
    return new Date(dt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.5} seed={7} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {([['all', 'Todo'], ['merch', 'Merch'], ['life', 'Vidas'], ['vip', 'VIP']] as const).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
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
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 52 }}>📦</Text>
          <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
          <Text style={styles.emptySub}>
            {tab === 'life' ? 'Compra vidas en la tienda' : tab === 'merch' ? 'Agrega merch al carrito' : tab === 'vip' ? 'Únete a un juego VIP' : 'Tus compras aparecerán aquí'}
          </Text>
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
          {filtered.map((entry) => {
            if (entry.type === 'merch') {
              const o = entry.order as MerchGroup;
              const emojis = o.items.slice(0, 3).map(i => i.emoji).join(' ');
              const extraCount = o.items.length - 3;
              const itemNames = o.items.map(i => `${i.quantity}× ${i.name}`).join(', ');
              return (
                <TouchableOpacity
                  key={`m-${o.id}`}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('OrderDetail', { type: 'merch', order: o })}
                >
                  {/* Order ID badge */}
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
            } else if (entry.type === 'life') {
              const o = entry.order as LifeOrder;
              const totalLives = o.lives * o.quantity;
              return (
                <TouchableOpacity
                  key={`l-${o.id}`}
                  style={[styles.card, styles.lifeCard]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('OrderDetail', { type: 'life', order: o })}
                >
                  <View style={styles.orderIdRow}>
                    <Text style={[styles.orderId, { color: '#EC4899' }]}>{fmtOrderNum(o.orderNumber)}</Text>
                    <Text style={styles.cardDate}>{formatDate(o.createdAt)}</Text>
                  </View>

                  <View style={styles.cardTop}>
                    <Text style={styles.cardEmojis}>❤️</Text>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{o.packLabel}</Text>
                      <Text style={styles.cardMeta}>{totalLives} vida{totalLives !== 1 ? 's' : ''} · {o.method.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.cardTotal}>S/{o.price.toFixed(2)}</Text>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={[badge.wrap, { backgroundColor: '#EC489922', borderColor: '#EC489955' }]}>
                      <Text style={[badge.text, { color: '#EC4899' }]}>✅ Acreditado</Text>
                    </View>
                    <Text style={styles.tapHint}>Ver detalle →</Text>
                  </View>
                </TouchableOpacity>
              );
            } else {
              const o = entry.order as VipEntry;
              return (
                <TouchableOpacity
                  key={`v-${o.id}`}
                  style={[styles.card, styles.vipCard]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('OrderDetail', { type: 'vip', order: o })}
                >
                  <View style={styles.orderIdRow}>
                    <Text style={[styles.orderId, { color: '#FACC15' }]}>{fmtOrderNum(o.orderNumber)}</Text>
                    <Text style={styles.cardDate}>{fmtGameDate(o.joinedAt)}</Text>
                  </View>

                  <View style={styles.cardTop}>
                    <Text style={styles.cardEmojis}>🎮</Text>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{o.game.title}</Text>
                      <Text style={styles.cardMeta}>{fmtGameDate(o.game.scheduledAt)}</Text>
                    </View>
                    <Text style={styles.cardTotal}>S/{o.game.entryFee.toFixed(2)}</Text>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={[badge.wrap, { backgroundColor: '#FACC1522', borderColor: '#FACC1555' }]}>
                      <Text style={[badge.text, { color: '#FACC15' }]}>🎮 Entrada VIP</Text>
                    </View>
                    <Text style={styles.tapHint}>Ver detalle →</Text>
                  </View>
                </TouchableOpacity>
              );
            }
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

  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 12 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabBtnActive: { backgroundColor: 'rgba(168,85,247,0.25)', borderColor: 'rgba(168,85,247,0.5)' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#A855F7', fontWeight: '900' },

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
  lifeCard: { borderColor: 'rgba(236,72,153,0.2)' },
  vipCard: { borderColor: 'rgba(250,204,21,0.25)' },

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
