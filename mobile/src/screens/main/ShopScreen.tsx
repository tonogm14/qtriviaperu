import React, { useState, useEffect, useCallback } from 'react';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { JuvShapes } from '../../components/JuvShapes';
import { SparkleMotif } from '../../components/JuvMotifs';
import { useStore } from '../../store/useStore';
import { track } from '../../services/analytics';
import { shopApi } from '../../services/api';

interface Props {
  navigation: any;
}

interface MerchItem {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  stock: number;
  gradient: string;
  sortOrder: number;
}

function parseMerchGradient(gradient: string | null | undefined): [string, string] {
  if (!gradient) return ['#6366F1', '#4338CA'];
  const parts = gradient.split(',').map(s => s.trim());
  if (parts.length >= 2) return [parts[0], parts[1]] as [string, string];
  return ['#6366F1', '#4338CA'];
}

const BagIcon: React.FC = () => (
  <Svg viewBox="0 0 24 24" width={22} height={22} fill="none">
    <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 6h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

function QtyRow({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <View style={qty.row}>
      <TouchableOpacity
        style={[qty.btn, value <= 1 && qty.btnDisabled]}
        onPress={() => onChange(Math.max(1, value - 1))}
        activeOpacity={0.7}
        disabled={value <= 1}
      >
        <Text style={qty.btnText}>−</Text>
      </TouchableOpacity>
      <Text style={qty.num}>{value}</Text>
      <TouchableOpacity
        style={[qty.btn, value >= max && qty.btnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        activeOpacity={0.7}
        disabled={value >= max}
      >
        <Text style={qty.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ShopScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useTabBarHeight();
  const { cart, addToCart } = useStore();

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedId, setAddedId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shopApi.listProducts();
      const { merch: fetchedMerch } = res.data.data;
      setMerch(fetchedMerch);
      const initial: Record<string, number> = {};
      fetchedMerch.forEach((m: MerchItem) => { initial[m.id] = 1; });
      setQuantities(initial);
    } catch {
      setError('No se pudo cargar la tienda. Reintentá más tarde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const addMerchToCart = (item: MerchItem) => {
    const quantity = quantities[item.id] ?? 1;
    track('tap', 'Shop', `add_to_cart_${item.id}`, { quantity });
    addToCart({
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      price: item.price,
      quantity,
      maxStock: item.stock,
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const setQty = (id: string, n: number) =>
    setQuantities(prev => ({ ...prev, [id]: n }));

  return (
    <LinearGradient
      colors={['#5B21B6', '#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.8} seed={3} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BagIcon />
            <Text style={styles.headerTitle}>Tienda</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => navigation.navigate('ShopCart')}
              activeOpacity={0.8}
            >
              <Text style={styles.cartIcon}>🛒</Text>
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ordersBtn}
              onPress={() => navigation.navigate('MyOrders')}
              activeOpacity={0.8}
            >
              <Text style={styles.ordersBtnText}>Mis pedidos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
          </View>
        )}

        {!loading && error !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && error === '' && (
          <>
            <View style={styles.sectionHeader}>
              <SparkleMotif size={12} color="#FACC15" />
              <Text style={styles.sectionTitle}>PRODUCTOS</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Productos oficiales QTrivia. Pedido en la app — envío a todo el Perú.
            </Text>

            {merch.length === 0 && (
              <Text style={styles.emptyText}>No hay productos disponibles en este momento.</Text>
            )}

            <View style={styles.merchGrid}>
              {merch.map((item) => {
                const q = quantities[item.id] ?? 1;
                const total = (item.price * q).toFixed(2);
                const outOfStock = item.stock === 0;
                return (
                  <View key={item.id} style={styles.merchCard}>
                    <Text style={styles.merchEmoji}>{item.emoji}</Text>
                    <View style={styles.merchInfo}>
                      <Text style={styles.merchName}>{item.name}</Text>
                      <Text style={styles.merchDesc}>{item.desc}</Text>
                      {outOfStock ? (
                        <Text style={styles.outOfStockText}>Sin stock</Text>
                      ) : (
                        <View style={styles.merchBottom}>
                          <QtyRow
                            value={q}
                            onChange={(n) => setQty(item.id, n)}
                            max={item.stock === -1 ? 10 : item.stock}
                          />
                          <View style={styles.merchPriceCol}>
                            <Text style={styles.merchTotal}>S/{total}</Text>
                            {q > 1 && <Text style={styles.merchUnit}>S/{item.price} c/u</Text>}
                          </View>
                        </View>
                      )}
                    </View>
                    {!outOfStock && (
                      <TouchableOpacity
                        onPress={() => addMerchToCart(item)}
                        activeOpacity={0.85}
                        disabled={addedId === item.id}
                      >
                        <LinearGradient
                          colors={addedId === item.id ? ['#10B981', '#059669'] : ['#A855F7', '#7C3AED']}
                          style={styles.merchBtn}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={styles.merchBtnText}>
                            {addedId === item.id ? '✓ Añadido' : '+ Carrito'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {cartCount > 0 && (
          <TouchableOpacity
            style={styles.viewCartBtn}
            onPress={() => navigation.navigate('ShopCart')}
            activeOpacity={0.85}
          >
            <Text style={styles.viewCartText}>🛒  Ver mi Carrito  ({cartCount})</Text>
            <Text style={styles.viewCartArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const qty = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  num: { color: 'white', fontSize: 15, fontWeight: '900', minWidth: 18, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 60, paddingHorizontal: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },

  cartBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FACC15',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  cartIcon: { fontSize: 22 },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },

  ordersBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ordersBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },

  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  errorContainer: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  errorText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  retryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16, fontStyle: 'italic' },
  outOfStockText: { color: '#F87171', fontSize: 12, fontWeight: '700', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#FACC15', letterSpacing: 4 },
  sectionDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20, marginBottom: 16 },

  merchGrid: { gap: 12, marginBottom: 14 },
  merchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  merchEmoji: { fontSize: 30 },
  merchInfo: { flex: 1, gap: 4 },
  merchName: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  merchDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  merchBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  merchPriceCol: { alignItems: 'flex-end' },
  merchTotal: { color: '#FACC15', fontSize: 15, fontWeight: '900' },
  merchUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 9 },
  merchBtn: {
    paddingHorizontal: 14, height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', minWidth: 60,
  },
  merchBtnText: { color: 'white', fontSize: 12, fontWeight: '900' },

  viewCartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FACC15', borderRadius: 999,
    paddingHorizontal: 24, paddingVertical: 16, marginTop: 20,
    shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 8,
  },
  viewCartText: { color: '#1F0A2E', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  viewCartArrow: { color: '#1F0A2E', fontSize: 18, fontWeight: '900' },
});
