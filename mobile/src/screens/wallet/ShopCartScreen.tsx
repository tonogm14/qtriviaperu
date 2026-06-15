import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';

interface Props {
  navigation: any;
}

function QtyControl({
  value,
  max,
  onInc,
  onDec,
  onRemove,
}: {
  value: number;
  max: number;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={qty.row}>
      <TouchableOpacity
        style={qty.btn}
        onPress={value <= 1 ? onRemove : onDec}
        activeOpacity={0.7}
      >
        <Text style={qty.btnText}>{value <= 1 ? '🗑' : '−'}</Text>
      </TouchableOpacity>
      <Text style={qty.num}>{value}</Text>
      <TouchableOpacity
        style={[qty.btn, value >= max && qty.btnDisabled]}
        onPress={onInc}
        activeOpacity={0.7}
        disabled={value >= max}
      >
        <Text style={qty.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ShopCartScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, removeFromCart, updateCartQty, clearCart } = useStore();

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const isEmpty = cart.length === 0;

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.4} seed={5} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        {!isEmpty && (
          <TouchableOpacity onPress={() => { if (cart.length > 0) clearCart(); }} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Vaciar</Text>
          </TouchableOpacity>
        )}
        {isEmpty && <View style={{ width: 60 }} />}
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySub}>Agrega productos de merch para continuar</Text>
          <TouchableOpacity style={styles.goShopBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goShopText}>Ver tienda →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {cart.map((item) => {
              const max = item.maxStock === -1 ? 10 : item.maxStock;
              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemUnit}>S/{item.price.toFixed(2)} c/u</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemTotal}>
                      S/{(item.price * item.quantity).toFixed(2)}
                    </Text>
                    <QtyControl
                      value={item.quantity}
                      max={max}
                      onInc={() => updateCartQty(item.id, item.quantity + 1)}
                      onDec={() => updateCartQty(item.id, item.quantity - 1)}
                      onRemove={() => removeFromCart(item.id)}
                    />
                  </View>
                </View>
              );
            })}

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Productos ({cart.reduce((s, i) => s + i.quantity, 0)})</Text>
                <Text style={styles.summaryValue}>S/{total.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Envío</Text>
                <Text style={[styles.summaryValue, { color: '#34D399' }]}>Por coordinar</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total productos</Text>
                <Text style={styles.totalValue}>S/{total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Sticky CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cta}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ShopCheckout')}
            >
              <View style={styles.ctaGold}>
                <Text style={styles.ctaText}>Continuar · S/{total.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
    </LinearGradient>
  );
};

const qty = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  btn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: 'white', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  num: { color: 'white', fontSize: 15, fontWeight: '900', minWidth: 20, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: 'white', fontSize: 22, fontWeight: '800', lineHeight: 24 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  goShopBtn: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  goShopText: { color: '#A855F7', fontSize: 15, fontWeight: '800' },

  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  itemEmoji: { fontSize: 32, flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemName: { color: 'white', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  itemUnit: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemTotal: { color: '#FACC15', fontSize: 16, fontWeight: '900' },

  summary: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 18, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  summaryValue: { color: 'white', fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  totalLabel: { color: 'white', fontSize: 15, fontWeight: '800' },
  totalValue: { color: '#FACC15', fontSize: 22, fontWeight: '900' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingBottom: 40, paddingTop: 12,
    backgroundColor: '#3B0764',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cta: { borderRadius: 999, overflow: 'hidden' },
  ctaGold: {
    height: 58, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 999,
    shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 10,
  },
  ctaText: { color: '#1F0A2E', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
});
