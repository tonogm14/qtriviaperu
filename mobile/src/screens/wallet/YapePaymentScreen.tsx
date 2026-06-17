import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Clipboard,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';
import { shopApi, configApi } from '../../services/api';

interface Props {
  navigation: any;
  route: {
    params: {
      orderData: {
        items: { itemId: string; quantity: number }[];
        recipientName: string;
        dni: string;
        phone: string;
        address: string;
        notes?: string;
      };
      total: number;
    };
  };
}

type Phase = 'loading' | 'culqi' | 'manual' | 'error';

export const YapePaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderData, total } = route.params;
  const { clearCart } = useStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [yapePhone, setYapePhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      shopApi.createYapeOrder(orderData),
      configApi.getPayment(),
    ])
      .then(([orderRes, configRes]) => {
        clearCart();
        const { checkoutUrl: url, culqiEnabled } = orderRes.data.data;
        setYapePhone(configRes.data.data.yapePhone ?? '');
        if (culqiEnabled && url) {
          setCheckoutUrl(url);
          setPhase('culqi');
        } else {
          setPhase('manual');
        }
      })
      .catch((e: any) => {
        const msg = e?.response?.data?.error ?? e?.message ?? 'Error al crear el pedido';
        setErrorMsg(msg);
        setPhase('error');
      });
  }, []);

  const handleCopy = () => {
    Clipboard.setString(yapePhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => navigation.replace('MyOrders');

  if (phase === 'loading') {
    return (
      <LinearGradient colors={['#4C1D95', '#3B0764']} style={styles.center}>
        <ActivityIndicator color="white" size="large" />
        <Text style={styles.loadingText}>Creando pedido…</Text>
      </LinearGradient>
    );
  }

  if (phase === 'error') {
    return (
      <LinearGradient colors={['#4C1D95', '#3B0764']} style={styles.center}>
        <Text style={styles.errorBig}>{errorMsg}</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>← Volver</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.4} seed={9} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago con Yape / Plin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>MONTO A PAGAR</Text>
          <Text style={styles.amountValue}>S/{total.toFixed(2)}</Text>
        </View>

        {phase === 'culqi' ? (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Presiona el botón para abrir la página de pago segura de Culqi. Ahí podrás pagar con Yape escaneando el QR.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.ctaPrimary}
              activeOpacity={0.85}
              onPress={() => checkoutUrl && Linking.openURL(checkoutUrl)}
            >
              <Text style={styles.ctaPrimaryText}>Pagar con Yape / Plin →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctaSecondary} activeOpacity={0.75} onPress={handleDone}>
              <Text style={styles.ctaSecondaryText}>Ya pagué — Ver mis pedidos</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.instructionCard}>
              <Text style={styles.stepTitle}>¿CÓMO PAGAR?</Text>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepText}>Abre tu app Yape o Plin</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepText}>Busca el número mostrado abajo</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepText}>
                  Envía exactamente:{' '}
                  <Text style={styles.stepAmount}>S/{total.toFixed(2)}</Text>
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
                <Text style={styles.stepText}>Presiona "Ya pagué" para confirmar</Text>
              </View>
            </View>

            <View style={styles.phoneCard}>
              <Text style={styles.phoneLabel}>NÚMERO YAPE / PLIN</Text>
              {yapePhone ? (
                <>
                  <Text style={styles.phoneNumber}>{yapePhone}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.75}>
                    <Text style={styles.copyBtnText}>{copied ? '✓ Copiado' : 'Copiar número'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.phoneUnavailable}>
                  Número no configurado. Contacta al equipo QTrivia.
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.ctaPrimary} activeOpacity={0.85} onPress={handleDone}>
              <Text style={styles.ctaPrimaryText}>Ya pagué — Ver mis pedidos</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.disclaimer}>
          El equipo QTrivia verificará el pago y coordinará el envío.
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  errorBig: { color: '#F87171', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  backLink: { marginTop: 10 },
  backLinkText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

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
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },

  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  amountCard: {
    backgroundColor: 'rgba(250,204,21,0.08)',
    borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)',
    alignItems: 'center', gap: 4,
  },
  amountLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  amountValue: { color: '#FACC15', fontSize: 36, fontWeight: '900' },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  infoText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 21, textAlign: 'center' },

  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12,
  },
  stepTitle: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#892BE5',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { color: 'white', fontSize: 12, fontWeight: '900' },
  stepText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, flex: 1, lineHeight: 19 },
  stepAmount: { color: '#FACC15', fontWeight: '900' },

  phoneCard: {
    backgroundColor: 'rgba(137,43,229,0.15)',
    borderRadius: 18, padding: 20, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#892BE5',
    alignItems: 'center', gap: 10,
  },
  phoneLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  phoneNumber: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  phoneUnavailable: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  copyBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(137,43,229,0.3)',
    borderRadius: 999, borderWidth: 1, borderColor: '#892BE5',
  },
  copyBtnText: { color: 'white', fontSize: 13, fontWeight: '800' },

  ctaPrimary: {
    height: 58, borderRadius: 999, marginBottom: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FACC15',
    shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 8,
  },
  ctaPrimaryText: { color: '#1F0A2E', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },

  ctaSecondary: {
    height: 50, borderRadius: 999, marginBottom: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },

  disclaimer: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center',
    lineHeight: 16, marginTop: 14,
  },
});
