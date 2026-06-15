import React, { useEffect, useRef, useState } from 'react';
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
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { SparkleMotif } from '../../components/JuvMotifs';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';
import { gamesApi } from '../../services/api';
import Svg, { Polyline } from 'react-native-svg';

interface Props {
  navigation: any;
  route: any;
}

type Method = 'yape' | 'plin' | 'card';

const METHODS: { id: Method; label: string; tag: string | null; color: string; glyph: string; sub: string }[] = [
  { id: 'yape',  label: 'Yape',     tag: 'Recomendado', color: '#7C3AED', glyph: 'Y', sub: 'Pago instantáneo · sin comisión' },
  { id: 'plin',  label: 'Plin',     tag: null,          color: '#0EA5E9', glyph: 'P', sub: 'Pago instantáneo · sin comisión' },
  { id: 'card',  label: 'Tarjeta',  tag: null,          color: '#1F0A2E', glyph: '💳', sub: 'Visa, Mastercard, Amex' },
];

const CONFETTI_COLORS = [Colors.yellow, Colors.pink, '#A855F7', '#34D399'];

const ConfettiPiece: React.FC<{ color: string; startX: number; delay: number }> = ({
  color,
  startX,
  delay,
}) => {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    translateY.value = withDelay(
      delay,
      withTiming(700, { duration: 2200, easing: Easing.out(Easing.quad) })
    );
    rotate.value = withDelay(delay, withRepeat(withTiming(360, { duration: 800 }), 3));
  }, [delay, opacity, rotate, translateY]);

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

export const VipPayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { incrementVipPot, setVipPot } = useStore();
  const vipGameId: string = route?.params?.gameId || 'vip';
  const [method, setMethod] = useState<Method>('yape');
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fee, setFee] = useState<number>(route?.params?.entryFee ?? 10);
  const [game, setGame] = useState<any>(route?.params?.game ?? null);
  const potScale = useSharedValue(1);
  const prevPot = useRef(game?.currentPot ?? 0);

  // Load game data from API if not passed as param
  useEffect(() => {
    if (game) {
      // Sync store to real API value to avoid stale accumulation
      setVipPot(game.currentPot ?? 0);
      return;
    }
    if (!vipGameId || vipGameId === 'vip') return;
    gamesApi.get(vipGameId)
      .then((r) => {
        const g = r.data?.data;
        if (g) { setGame(g); setFee(g.entryFee ?? fee); setVipPot(g.currentPot ?? 0); }
      })
      .catch(() => {});
  }, [vipGameId]); // eslint-disable-line

  useEffect(() => {
    // Only animate growing pot for pure POT mode
    if (game?.prizeMode !== 'POT') return;
    const interval = setInterval(() => {
      incrementVipPot(Math.floor(Math.random() * 6) + 1);
      setGame((g: any) => g ? { ...g, currentPot: (g.currentPot ?? 0) + Math.floor(Math.random() * 6) + 1 } : g);
    }, 1800);
    return () => clearInterval(interval);
  }, [incrementVipPot, game?.prizeMode]);

  useEffect(() => {
    const pot = game?.currentPot ?? 0;
    if (pot !== prevPot.current) {
      potScale.value = withSpring(1.04, { damping: 8 }, () => {
        potScale.value = withSpring(1, { damping: 8 });
      });
      prevPot.current = pot;
    }
  }, [potScale, game?.currentPot]);

  const potStyle = useAnimatedStyle(() => ({
    transform: [{ scale: potScale.value }],
  }));

  // ── Prize display based on prizeMode ──────────────────────────────────────
  const currentPot = game?.currentPot ?? 0;
  const displayPrize = (() => {
    if (!game) return currentPot;
    if (game.prizeMode === 'FIXED') return game.prize ?? 0;
    if (game.prizeMode === 'POT_PERCENT') return Math.round(currentPot * (game.potPercent ?? 100) / 100);
    return currentPot; // POT
  })();

  const prizeLabel = (() => {
    if (!game || game.prizeMode === 'POT' || game.prizeMode === 'POT_PERCENT') return 'BOTE';
    if (game.prizeMode === 'FIXED') return 'PREMIO FIJO';
    return 'BOTE';
  })();

  const isGrowing = !game || game.prizeMode !== 'FIXED';

  // ── Prize breakdown text from winnerMode / prizeSlots ─────────────────────
  const breakdownText = (() => {
    if (!game) return '50% / 30% / 20% para los 3 primeros lugares';
    const wm = game.winnerMode ?? 'SINGLE';
    const slots: any[] = Array.isArray(game.prizeSlots) ? game.prizeSlots : [];
    if (wm === 'ALL_CORRECT') return 'El premio se reparte en partes iguales entre todos los que completen correctamente';
    if (wm === 'RANKED_SLOTS' && slots.length > 0) {
      return slots
        .sort((a: any, b: any) => a.place - b.place)
        .map((s: any) => `${s.place}° ${s.percent}%`)
        .join(' · ');
    }
    return '100% para el 1er lugar';
  })();

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      await gamesApi.join(vipGameId);
      setPaid(true);
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.code === 'ERR_NETWORK') {
        setPaid(true);
      } else {
        setError(e?.response?.data?.error || 'Error al procesar el pago. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

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
            colors={[Colors.yellow, Colors.yellowDark]}
            style={styles.successCircle}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Svg width={56} height={56} viewBox="0 0 24 24">
              <Polyline
                points="20 6 9 17 4 12"
                fill="none"
                stroke="#1F0A2E"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </LinearGradient>

          <Text style={styles.successTitle}>¡Estás dentro!</Text>
          <Text style={styles.successSub}>
            Te avisamos a las 8:55 PM.{'\n'}Prepárate para ganar.
          </Text>

          {game?.prizeMode !== 'POT_PERCENT' && (
            <View style={styles.boteCard}>
              <SparkleMotif size={22} color={Colors.yellow} />
              <View>
                <Text style={styles.boteCardLabel}>{prizeLabel}</Text>
                <Animated.View style={potStyle}>
                  <Text style={styles.boteCardAmount}>S/{displayPrize.toLocaleString()}</Text>
                </Animated.View>
              </View>
            </View>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.85}
            style={{ width: '100%' }}
          >
            <LinearGradient
              colors={[Colors.yellow, Colors.yellowDark]}
              style={styles.homeBtn}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.homeBtnText}>Volver al inicio</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1F0A2E', '#4C1D95', '#2D0A4F']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.5} seed={4} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerSup}>TRIVIA VIP · 9 PM</Text>
          <Text style={styles.headerTitle}>Confirmar pago</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGlowTop} />
          <View style={styles.summaryGlowBottom} />
          <View style={{ position: 'absolute', top: 16, right: 18, opacity: 0.5 }}>
            <SparkleMotif size={16} color="#FACC15" />
          </View>
          <View style={{ position: 'absolute', top: 60, left: 16, opacity: 0.4 }}>
            <SparkleMotif size={10} color="#F472B6" />
          </View>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summarySubLabel}>INSCRIPCIÓN</Text>
              <Text style={styles.summaryFee}>S/{fee}</Text>
            </View>
            {game?.prizeMode !== 'POT_PERCENT' && (
              <View style={styles.summaryBoteCol}>
                <Text style={styles.summaryBoteLabel}>{prizeLabel}</Text>
                <Animated.View style={potStyle}>
                  <Text style={styles.summaryBoteAmount}>S/{displayPrize.toLocaleString()}</Text>
                </Animated.View>
                {game?.prizeMode === 'POT' && <Text style={styles.summaryBoteGrowing}>↑ creciendo</Text>}
              </View>
            )}
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryInfo}>
            <SparkleMotif size={12} color={Colors.yellow} />
            <Text style={styles.summaryInfoText}>{breakdownText}</Text>
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Footer disclaimer */}
        <Text style={styles.disclaimer}>
          Al confirmar aceptás los términos. Bote final se reparte 9:30 PM.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={handlePay}
          activeOpacity={loading ? 1 : 0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['rgba(250,204,21,0.5)', 'rgba(245,158,11,0.5)'] : [Colors.yellow, Colors.yellowDark]}
            style={styles.ctaButton}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnYellow} />
            ) : (
              <Text style={styles.ctaText}>Pagar S/{fee} · Entrar al bote</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    gap: 12,
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  headerText: {
    gap: 2,
  },
  headerSup: {
    color: Colors.yellow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scroll: {
    paddingHorizontal: 18,
  },
  summaryCard: {
    borderRadius: 26,
    padding: 18,
    marginBottom: 22,
    backgroundColor: '#2D0A4F',
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.35)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 56,
    elevation: 12,
  },
  summaryGlowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(250,204,21,0.35)',
    opacity: 0.4,
  },
  summaryGlowBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(236,72,153,0.3)',
    opacity: 0.4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summarySubLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryFee: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4,
  },
  summaryBoteCol: {
    alignItems: 'flex-end',
  },
  summaryBoteLabel: {
    color: Colors.yellow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryBoteAmount: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  summaryBoteGrowing: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  methodList: {
    gap: 10,
    marginBottom: 24,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  methodItemActive: {
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderColor: Colors.yellow,
  },
  methodGlyph: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodGlyphText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 18,
  },
  methodInfo: {
    flex: 1,
  },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodLabel: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  methodTag: {
    backgroundColor: Colors.yellow,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  methodTagText: {
    color: Colors.textOnYellow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  methodSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  methodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodRadioActive: {
    backgroundColor: Colors.yellow,
    borderColor: Colors.yellow,
  },
  methodRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textOnYellow,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaButton: {
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 10,
  },
  ctaText: {
    color: Colors.textOnYellow,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Success
  successContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 28,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 12,
  },
  successTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  successSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 28,
  },
  boteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.25)',
    width: '100%',
  },
  boteCardLabel: {
    color: Colors.yellow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  boteCardAmount: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  homeBtn: {
    width: '100%',
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 10,
  },
  homeBtnText: {
    color: Colors.textOnYellow,
    fontSize: 16,
    fontWeight: '900',
  },
});
