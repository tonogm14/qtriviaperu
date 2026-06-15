import React, { useEffect, useState } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Polyline } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { SparkleMotif } from '../../components/JuvMotifs';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';
import { shopApi } from '../../services/api';
import { track } from '../../services/analytics';

interface Props {
  navigation: any;
  route: any;
}

type Method = 'yape' | 'plin' | 'card';

const METHODS: { id: Method; label: string; tag: string | null; color: string; glyph: string; sub: string }[] = [
  { id: 'yape',  label: 'Yape',    tag: 'Recomendado', color: '#7C3AED', glyph: 'Y',  sub: 'Pago instantáneo · sin comisión' },
  { id: 'plin',  label: 'Plin',    tag: null,           color: '#0EA5E9', glyph: 'P',  sub: 'Pago instantáneo · sin comisión' },
  { id: 'card',  label: 'Tarjeta', tag: null,           color: '#374151', glyph: '💳', sub: 'Visa, Mastercard, Amex'          },
];

const CONFETTI_COLORS = [Colors.yellow, Colors.pink, '#A855F7', '#34D399'];

const ConfettiPiece: React.FC<{ color: string; startX: number; delay: number }> = ({ color, startX, delay }) => {
  const translateY = useSharedValue(-20);
  const opacity    = useSharedValue(0);
  const rotate     = useSharedValue(0);

  useEffect(() => {
    opacity.value    = withDelay(delay, withTiming(1, { duration: 200 }));
    translateY.value = withDelay(delay, withTiming(700, { duration: 2200, easing: Easing.out(Easing.quad) }));
    rotate.value     = withDelay(delay, withRepeat(withTiming(360, { duration: 800 }), 3));
  }, []); // eslint-disable-line

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: startX },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left: 0, width: 8, height: 12, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
};

export const ShopPayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { lives, loadUser } = useStore();

  const type: 'lives' | 'merch'       = route?.params?.type ?? 'lives';
  const pack: 'single' | 'pack3' | 'pack5' = route?.params?.pack ?? 'single';
  const packLives: number              = route?.params?.lives ?? 1;
  const itemId: string                 = route?.params?.itemId ?? '';
  const emoji: string                  = route?.params?.emoji ?? '';
  const label: string                  = route?.params?.label ?? '';
  const unitPrice: number              = route?.params?.price ?? 0;
  const quantity: number               = route?.params?.quantity ?? 1;
  const gradient: [string, string]     = route?.params?.gradient ?? ['#A855F7', '#7C3AED'];

  const total = unitPrice * quantity;

  const [method, setMethod]   = useState<Method>('yape');
  const [loading, setLoading] = useState(false);
  const [paid, setPaid]       = useState(false);
  const [error, setError]     = useState('');

  const paymentInstructions =
    method === 'yape'
      ? `Yapea S/${total.toFixed(2)} al 9XX-XXX-XXX\nAsunto: "QTrivia${type === 'lives' ? ' vidas' : ' merch'}"`
      : method === 'plin'
      ? `Plin S/${total.toFixed(2)} al 9XX-XXX-XXX\nAsunto: "QTrivia${type === 'lives' ? ' vidas' : ' merch'}"`
      : `Paga S/${total.toFixed(2)} con tarjeta en qtrivia.com/pago`;

  const successTitle  = type === 'lives' ? '¡Vidas añadidas!' : '¡Pedido recibido!';
  const successDetail =
    type === 'lives'
      ? `${quantity > 1 ? `${quantity}× ` : ''}${packLives * quantity} vida${packLives * quantity > 1 ? 's' : ''} acreditada${packLives * quantity > 1 ? 's' : ''} a tu cuenta.\nAhora tienes `
      : `${quantity}× ${label} en camino.\nTe contactamos en menos de 24 h.`;

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      if (type === 'lives') {
        await shopApi.buyLives(pack, method, quantity);
        await loadUser();
        track('buy_lives', 'ShopPay', pack, { method, quantity });
      } else {
        await shopApi.orderMerch(itemId, method, quantity);
        track('buy_merch', 'ShopPay', itemId, { method, quantity });
      }
      setPaid(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al procesar. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────
  if (paid) {
    return (
      <LinearGradient
        colors={['#1F0A2E', '#4C1D95', '#2D0A4F']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <StatusBar style="light" />
        <JuvShapes density={0.6} seed={2} />

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 14 }).map((_, i) => (
            <ConfettiPiece
              key={i}
              color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              startX={(i * 7 + 5) % 95}
              delay={i * 50}
            />
          ))}
        </View>

        <View style={styles.successContent}>
          <LinearGradient
            colors={gradient}
            style={styles.successCircle}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {type === 'lives' ? (
              <Svg width={56} height={56} viewBox="0 0 24 24">
                <Polyline
                  points="20 6 9 17 4 12"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <Text style={{ fontSize: 36 }}>{emoji}</Text>
            )}
          </LinearGradient>

          <Text style={styles.successTitle}>{successTitle}</Text>

          <Text style={styles.successSub}>
            {successDetail}
            {type === 'lives' && (
              <Text style={{ color: '#EC4899', fontWeight: '900' }}>{lives}</Text>
            )}
            {type === 'lives' && ` vida${lives !== 1 ? 's' : ''}.`}
          </Text>

          {type === 'lives' && (
            <View style={styles.infoCard}>
              <SparkleMotif size={20} color="#EC4899" />
              <View>
                <Text style={styles.infoCardLabel}>TUS VIDAS</Text>
                <Text style={styles.infoCardValue}>{lives} ❤️</Text>
              </View>
            </View>
          )}

          {type === 'merch' && (
            <View style={styles.infoCard}>
              <Text style={{ fontSize: 28 }}>{emoji}</Text>
              <View>
                <Text style={styles.infoCardLabel}>PEDIDO</Text>
                <Text style={styles.infoCardValue}>{quantity}× {label}</Text>
              </View>
            </View>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Shop')}
            activeOpacity={0.85}
            style={{ width: '100%' }}
          >
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              style={styles.homeBtn}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.homeBtnText}>Volver a la tienda</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Payment form ───────────────────────────────────────────────
  return (
    <LinearGradient
      colors={['#1F0A2E', '#4C1D95', '#2D0A4F']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.5} seed={4} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerSup}>{type === 'lives' ? 'TIENDA · VIDAS' : 'TIENDA · MERCH'}</Text>
          <Text style={styles.headerTitle}>Confirmar pago</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGlow} />
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summarySubLabel}>TOTAL A PAGAR</Text>
              <Text style={styles.summaryFee}>S/{total.toFixed(2)}</Text>
              <Text style={styles.summaryDetail}>
                {quantity > 1
                  ? `${quantity} × S/${unitPrice.toFixed(2)} · `
                  : ''}
                {label}
                {type === 'lives' && ` · ${packLives * quantity} vida${packLives * quantity > 1 ? 's' : ''}`}
              </Text>
            </View>
            <LinearGradient
              colors={gradient}
              style={styles.summaryIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {type === 'lives' ? (
                <Svg viewBox="0 0 24 24" width={26} height={26}>
                  <Path
                    d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                    fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                </Svg>
              ) : (
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              )}
            </LinearGradient>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryInfo}>
            <SparkleMotif size={12} color="#EC4899" />
            <Text style={styles.summaryInfoText}>
              {type === 'lives'
                ? 'Las vidas se acreditan automáticamente al confirmar.'
                : 'Te contactamos en menos de 24 h para coordinar el envío.'}
            </Text>
          </View>
        </View>

        {/* Method picker */}
        <Text style={styles.sectionLabel}>MÉTODO DE PAGO</Text>
        <View style={styles.methodList}>
          {METHODS.map((m) => {
            const sel = method === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMethod(m.id)}
                style={[styles.methodItem, sel && styles.methodItemActive]}
                activeOpacity={0.8}
              >
                <View style={[styles.methodGlyph, { backgroundColor: m.color }]}>
                  <Text style={styles.methodGlyphText}>{m.glyph}</Text>
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <Text style={styles.methodLabel}>{m.label}</Text>
                    {m.tag && (
                      <View style={styles.methodTag}>
                        <Text style={styles.methodTagText}>{m.tag}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.methodSub}>{m.sub}</Text>
                </View>
                <View style={[styles.methodRadio, sel && styles.methodRadioActive]}>
                  {sel && <View style={styles.methodRadioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>{paymentInstructions}</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.disclaimer}>
          Al confirmar declarás que realizaste el pago.
          {type === 'lives' ? ' Las vidas se acreditan de inmediato.' : ' El pedido queda registrado y te contactamos.'}
        </Text>

        <TouchableOpacity onPress={handlePay} activeOpacity={loading ? 1 : 0.85} disabled={loading}>
          <LinearGradient
            colors={loading ? ['rgba(168,85,247,0.5)', 'rgba(124,58,237,0.5)'] : ['#A855F7', '#7C3AED']}
            style={styles.ctaButton}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.ctaText}>Ya pagué · Confirmar S/{total.toFixed(2)}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: 'white', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  headerText: { gap: 2 },
  headerSup: { color: '#EC4899', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 18 },

  summaryCard: {
    borderRadius: 22, padding: 18, marginBottom: 22,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.22)',
    overflow: 'hidden', position: 'relative',
  },
  summaryGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summarySubLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  summaryFee: { color: 'white', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  summaryDetail: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  summaryIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 },
  summaryInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryInfoText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },

  sectionLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  methodList: { gap: 10, marginBottom: 18 },
  methodItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
  },
  methodItemActive: { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: '#A855F7' },
  methodGlyph: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  methodGlyphText: { color: 'white', fontWeight: '900', fontSize: 18 },
  methodInfo: { flex: 1 },
  methodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodLabel: { color: 'white', fontSize: 15, fontWeight: '800' },
  methodTag: { backgroundColor: '#A855F7', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  methodTagText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  methodSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  methodRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  methodRadioActive: { backgroundColor: '#A855F7', borderColor: '#A855F7' },
  methodRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },

  instructions: {
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.22)',
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 18,
  },
  instructionsText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 21 },

  errorText: { color: '#FCA5A5', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  disclaimer: { color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center', marginBottom: 12 },
  ctaButton: {
    height: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6, shadowRadius: 32, elevation: 10,
  },
  ctaText: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },

  // Success
  successContent: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 },
  successCircle: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 40, marginBottom: 28,
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 50, elevation: 12,
  },
  successTitle: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
  successSub: {
    color: 'rgba(255,255,255,0.75)', fontSize: 15,
    textAlign: 'center', lineHeight: 22,
    maxWidth: 280, marginBottom: 28,
  },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', width: '100%',
  },
  infoCardLabel: { color: '#EC4899', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  infoCardValue: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  homeBtn: {
    width: '100%', height: 56, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6, shadowRadius: 32, elevation: 10,
  },
  homeBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
