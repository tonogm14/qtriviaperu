import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';
import { shopApi } from '../../services/api';

interface Props {
  navigation: any;
}

type PayMethod = 'yapeplin' | 'card';

const PAY_METHODS: { id: PayMethod; label: string; color: string; badge: string }[] = [
  { id: 'yapeplin', label: 'Yape / Plin', color: '#892BE5', badge: 'Escanea y paga' },
  { id: 'card', label: 'Tarjeta', color: '#FACC15', badge: 'Pendiente' },
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  optional?: boolean;
}) {
  return (
    <View style={field.wrap}>
      <Text style={field.label}>
        {label}{optional ? <Text style={field.opt}> · opcional</Text> : null}
      </Text>
      <TextInput
        style={[field.input, multiline && field.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor="rgba(255,255,255,0.2)"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

export const ShopCheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { cart, clearCart, user } = useStore();

  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<PayMethod>('yapeplin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const canSubmit = !!(recipientName.trim() && dni.trim() && phone.trim() && address.trim() && !loading);

  const handleOrder = async () => {
    if (!canSubmit) return;
    if (method === 'yapeplin') {
      navigation.navigate('YapePayment', {
        orderData: {
          items: cart.map((i) => ({ itemId: i.id, quantity: i.quantity })),
          recipientName: recipientName.trim(),
          dni: dni.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim() || undefined,
        },
        total,
      });
      return;
    }
    setLoading(true);
    setError('');
    try {
      await shopApi.cartCheckout({
        items: cart.map((i) => ({ itemId: i.id, quantity: i.quantity })),
        method: 'card',
        recipientName: recipientName.trim(),
        dni: dni.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim() || undefined,
      });
      clearCart();
      navigation.replace('MyOrders');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'Error al procesar el pedido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.4} seed={6} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos de envío</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Order summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen del pedido</Text>
            {cart.map((i) => (
              <View key={i.id} style={styles.summaryRow}>
                <Text style={styles.summaryEmoji}>{i.emoji}</Text>
                <Text style={styles.summaryName}>{i.quantity}× {i.name}</Text>
                <Text style={styles.summaryPrice}>S/{(i.price * i.quantity).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={{ flex: 1 }} />
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>S/{total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Shipping form */}
          <Text style={styles.sectionLabel}>QUIÉN RECIBE</Text>

          <Field label="Nombre completo" value={recipientName} onChange={setRecipientName} placeholder="Tu nombre completo" />
          <Field label="DNI" value={dni} onChange={setDni} placeholder="12345678" keyboardType="numeric" />
          <Field label="Teléfono de contacto" value={phone} onChange={setPhone} placeholder="9XXXXXXXX" keyboardType="phone-pad" />
          <Field label="Dirección de envío" value={address} onChange={setAddress} placeholder="Av. Ejemplo 123, Lima" />
          <Field label="Notas" value={notes} onChange={setNotes} placeholder="Referencias, instrucciones…" multiline optional />

          {/* Payment method */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>MÉTODO DE PAGO</Text>
          <View style={styles.methodRow}>
            {PAY_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodBtn, method === m.id && { borderColor: m.color, backgroundColor: m.color + '18' }]}
                onPress={() => setMethod(m.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodDot, { backgroundColor: m.color }]} />
                <View>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <Text style={styles.methodBadge}>{m.badge}</Text>
                </View>
                {method === m.id && (
                  <View style={[styles.methodCheck, { backgroundColor: m.color }]}>
                    <Text style={styles.methodCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* CTA */}
          <TouchableOpacity
            style={{ marginTop: 24 }}
            activeOpacity={canSubmit ? 0.85 : 1}
            disabled={!canSubmit}
            onPress={handleOrder}
          >
            <View style={[styles.cta, !canSubmit && styles.ctaDisabled]}>
              {loading ? (
                <ActivityIndicator color="#1F0A2E" />
              ) : (
                <Text style={[styles.ctaText, !canSubmit && styles.ctaTextDisabled]}>
                  Confirmar pedido · S/{total.toFixed(2)}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Te contactaremos para coordinar el pago y confirmar el envío.
          </Text>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const field = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  opt: { color: 'rgba(255,255,255,0.35)', fontWeight: '400', letterSpacing: 0 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: 'white', fontSize: 15, fontWeight: '600',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  multiline: { height: 90, textAlignVertical: 'top', paddingTop: 14 },
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

  scroll: { paddingHorizontal: 18, paddingTop: 4 },

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  summaryTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryEmoji: { fontSize: 20 },
  summaryName: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  summaryPrice: { color: 'white', fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginRight: 8 },
  totalValue: { color: '#FACC15', fontSize: 20, fontWeight: '900' },

  sectionLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },

  methodRow: { gap: 10, marginBottom: 10 },
  methodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  methodDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  methodLabel: { color: 'white', fontSize: 14, fontWeight: '800' },
  methodBadge: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 },
  methodCheck: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  methodCheckText: { color: 'white', fontSize: 12, fontWeight: '900' },

  errorText: { color: '#F87171', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  cta: {
    height: 58, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FACC15',
    shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 8,
  },
  ctaDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: { color: '#1F0A2E', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  ctaTextDisabled: { color: 'rgba(255,255,255,0.3)' },

  disclaimer: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center',
    lineHeight: 18, marginTop: 14,
  },
});
