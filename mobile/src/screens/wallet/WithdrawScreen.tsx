import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SolMotif } from '../../components/JuvMotifs';
import { JuvShapes } from '../../components/JuvShapes';
import { Colors } from '../../theme/colors';
import { useStore } from '../../store/useStore';
import { withdrawalsApi, configApi } from '../../services/api';

interface Props {
  navigation: any;
}

type Method =
  | 'Yape' | 'Plin'
  | 'BCP' | 'Interbank' | 'BBVA' | 'Scotiabank'
  | 'BanBif' | 'Pichincha' | 'Mibanco' | 'GNB'
  | 'Falabella' | 'Ripley';

const WALLETS: Method[] = ['Yape', 'Plin'];
const BANKS: Method[]   = ['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'BanBif', 'Pichincha', 'Mibanco', 'GNB', 'Falabella', 'Ripley'];

const METHOD_BASE: Record<Method, { color: string; badgeColor: string }> = {
  Yape:       { color: '#892BE5', badgeColor: '#FACC15' },
  Plin:       { color: '#00D4D6', badgeColor: '#FACC15' },
  BCP:        { color: '#0033A0', badgeColor: '#FACC15' },
  Interbank:  { color: '#007B3C', badgeColor: '#FACC15' },
  BBVA:       { color: '#004481', badgeColor: '#FACC15' },
  Scotiabank: { color: '#EC111A', badgeColor: '#FACC15' },
  BanBif:     { color: '#00A0C8', badgeColor: '#FACC15' },
  Pichincha:  { color: '#FF6B00', badgeColor: '#FACC15' },
  Mibanco:    { color: '#E30613', badgeColor: '#FACC15' },
  GNB:        { color: '#002D6E', badgeColor: '#FACC15' },
  Falabella:  { color: '#4CAF50', badgeColor: '#FACC15' },
  Ripley:     { color: '#7B2D8B', badgeColor: '#FACC15' },
};

const METHOD_API: Record<Method, string> = {
  Yape:       'yape',
  Plin:       'plin',
  BCP:        'bcp',
  Interbank:  'interbank',
  BBVA:       'bbva',
  Scotiabank: 'scotiabank',
  BanBif:     'banbif',
  Pichincha:  'pichincha',
  Mibanco:    'mibanco',
  GNB:        'gnb',
  Falabella:  'falabella',
  Ripley:     'ripley',
};

export const WithdrawScreen: React.FC<Props> = ({ navigation }) => {
  const { balance, user } = useStore();
  const [method, setMethod] = useState<Method>('Yape');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minWithdraw, setMinWithdraw] = useState(20);
  const [feeYape, setFeeYape]   = useState(0);
  const [feePlin, setFeePlin]   = useState(0);
  const [feeBCP, setFeeBCP]     = useState(0);
  const [feeBank, setFeeBank]   = useState(0); // aplica a todos los bancos excepto BCP

  useEffect(() => {
    configApi.getWithdrawConfig()
      .then(r => {
        const d = r.data.data;
        setMinWithdraw(d.minWithdraw ?? 20);
        setFeeYape(d.feeYape ?? 0);
        setFeePlin(d.feePlin ?? 0);
        setFeeBCP(d.feeBCP ?? 0);
        setFeeBank(d.feeInterbank ?? 0);
      })
      .catch(() => {});
  }, []);

  const feeRateFor = (m: Method): number => {
    if (m === 'Yape') return feeYape;
    if (m === 'Plin') return feePlin;
    if (m === 'BCP')  return feeBCP;
    return feeBank;
  };

  const presets = [minWithdraw, minWithdraw * 2, minWithdraw * 4, minWithdraw * 8];

  const isWallet  = WALLETS.includes(method);
  const numAmount = parseFloat(amount) || 0;
  const feeRate   = feeRateFor(method);
  const fee       = numAmount > 0 ? Math.round(numAmount * feeRate / 100 * 100) / 100 : 0;
  const net       = numAmount - fee;
  const isValid   = numAmount >= minWithdraw && numAmount <= balance && !loading;

  const methodConfig = (m: Method) => {
    const r = feeRateFor(m);
    return {
      ...METHOD_BASE[m],
      feeRate: r,
      badge: `24-48h${r > 0 ? ` · ${r}%` : ''}`,
    };
  };

  const handleWithdraw = async () => {
    if (!isValid) return;
    if (!phone.trim()) {
      setError('Ingresa tu número de teléfono para recibir el pago.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await withdrawalsApi.create({
        amount: numAmount,
        method: METHOD_API[method],
        accountRef: phone.trim(),
      });
      const withdrawal = res.data.data;
      const code = withdrawal?.code || 'QT------';
      navigation.navigate('WithdrawSuccess', { amount: numAmount, net, method, code });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al procesar el retiro. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientMid, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.6} seed={1} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Retirar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Balance card */}
        <LinearGradient
          colors={[Colors.yellow, Colors.yellowDark]}
          style={styles.balanceCard}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.solDecoration}>
            <SolMotif size={120} color="#1F0A2E" />
          </View>
          <Text style={styles.balanceLabel}>SALDO DISPONIBLE</Text>
          <Text style={styles.balanceAmount}>S/{balance.toFixed(2)}</Text>
          <Text style={styles.balanceSub}>Mínimo S/{minWithdraw} · Sin tope mensual</Text>
        </LinearGradient>

        {/* Method selector */}
        <Text style={styles.sectionLabel}>MÉTODO DE RETIRO</Text>

        <Text style={styles.groupLabel}>Billeteras digitales</Text>
        <View style={[styles.methodList, { marginBottom: 12 }]}>
          {WALLETS.map((m) => {
            const cfg = methodConfig(m);
            const isActive = method === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.methodItem, isActive && styles.methodItemActive]}
                onPress={() => setMethod(m)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodAvatar, { backgroundColor: cfg.color }]}>
                  <Text style={styles.methodAvatarText}>{m[0]}</Text>
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <Text style={styles.methodName}>{m}</Text>
                    <View style={[styles.methodBadge, { backgroundColor: cfg.badgeColor + '25', borderColor: cfg.badgeColor + '55' }]}>
                      <Text style={[styles.methodBadgeText, { color: cfg.badgeColor }]}>{cfg.badge}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.methodRadio, isActive && styles.methodRadioActive]}>
                  {isActive && <View style={styles.methodRadioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.groupLabel}>Bancos</Text>
        <View style={[styles.methodList, { marginBottom: 22 }]}>
          {BANKS.map((m) => {
            const cfg = methodConfig(m);
            const isActive = method === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.methodItem, isActive && styles.methodItemActive]}
                onPress={() => setMethod(m)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodAvatar, { backgroundColor: cfg.color }]}>
                  <Text style={styles.methodAvatarText}>{m[0]}</Text>
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <Text style={styles.methodName}>{m}</Text>
                    <View style={[styles.methodBadge, { backgroundColor: cfg.badgeColor + '25', borderColor: cfg.badgeColor + '55' }]}>
                      <Text style={[styles.methodBadgeText, { color: cfg.badgeColor }]}>{cfg.badge}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.methodRadio, isActive && styles.methodRadioActive]}>
                  {isActive && <View style={styles.methodRadioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account reference */}
        <Text style={styles.sectionLabel}>
          {isWallet ? `NÚMERO DE ${method.toUpperCase()}` : 'NÚMERO DE CUENTA'}
        </Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.phonePrefix}>{isWallet ? '📱' : '🏦'}</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            keyboardType={isWallet ? 'phone-pad' : 'numeric'}
            placeholder={isWallet ? '9XXXXXXXX' : 'Número de cuenta o CCI'}
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
        </View>

        {/* Amount input */}
        <Text style={styles.sectionLabel}>MONTO</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.amountCurrency}>S/</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
          <TouchableOpacity
            onPress={() => setAmount(String(balance))}
            style={styles.maxBtn}
          >
            <Text style={styles.maxBtnText}>MAX</Text>
          </TouchableOpacity>
        </View>

        {/* Preset amounts */}
        <View style={styles.presetsRow}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.presetBtn, amount === String(p) && styles.presetBtnActive]}
              onPress={() => setAmount(String(p))}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetTxt, amount === String(p) && styles.presetTxtActive]}>
                S/{p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Breakdown */}
        {numAmount > 0 && (
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Monto</Text>
              <Text style={styles.breakdownValue}>S/{numAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {feeRate > 0 ? `Comisión (${feeRate}%)` : 'Comisión'}
              </Text>
              <Text style={[styles.breakdownValue, { color: fee > 0 ? '#F472B6' : '#34D399' }]}>
                {fee === 0 ? 'Gratis' : `– S/${fee.toFixed(2)}`}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Recibes</Text>
              <Text style={styles.breakdownTotalValue}>S/{Math.max(0, net).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Validation messages */}
        {numAmount > 0 && numAmount < minWithdraw && (
          <Text style={styles.validationMsg}>Mínimo de retiro: S/{minWithdraw}</Text>
        )}
        {numAmount > balance && (
          <Text style={styles.validationMsg}>Saldo insuficiente</Text>
        )}
        {error ? (
          <Text style={styles.validationMsg}>{error}</Text>
        ) : null}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleWithdraw}
          activeOpacity={isValid ? 0.85 : 1}
          disabled={!isValid}
          style={{ marginTop: 12 }}
        >
          <LinearGradient
            colors={isValid ? [Colors.yellow, Colors.yellowDark] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
            style={styles.ctaButton}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnYellow} />
            ) : (
              <Text style={[styles.ctaText, !isValid && { color: 'rgba(255,255,255,0.4)' }]}>
                {isValid ? `Retirar S/${Math.max(0, net).toFixed(2)}` : 'Retirar'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
          style={styles.historyLink}
        >
          <Text style={styles.historyLinkText}>Ver historial de retiros →</Text>
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
  scroll: {
    paddingHorizontal: 18,
  },
  balanceCard: {
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  solDecoration: {
    position: 'absolute',
    top: -22,
    right: -22,
    opacity: 0.3,
  },
  balanceLabel: {
    color: '#1F0A2E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    opacity: 0.7,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#1F0A2E',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  balanceSub: {
    color: '#1F0A2E',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 4,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  methodList: {
    gap: 8,
    marginBottom: 22,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
  },
  methodItemActive: {
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderColor: Colors.yellow,
  },
  methodAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  methodInfo: {
    flex: 1,
  },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodName: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  methodSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
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
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  phonePrefix: {
    fontSize: 20,
  },
  phoneInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  amountCurrency: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 22,
    fontWeight: '800',
  },
  amountInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    padding: 0,
  },
  maxBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  maxBtnText: {
    color: Colors.textOnYellow,
    fontSize: 12,
    fontWeight: '800',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(250,204,21,0.20)',
    borderColor: Colors.yellow,
  },
  presetTxt: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  presetTxtActive: {
    color: Colors.yellow,
  },
  breakdown: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownValue: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  breakdownTotalLabel: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownTotalValue: {
    color: Colors.yellow,
    fontSize: 22,
    fontWeight: '900',
  },
  validationMsg: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaButton: {
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 10,
  },
  ctaText: {
    color: Colors.textOnYellow,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  historyLink: {
    alignItems: 'center',
    padding: 14,
    marginTop: 10,
  },
  historyLinkText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '800',
  },
});
