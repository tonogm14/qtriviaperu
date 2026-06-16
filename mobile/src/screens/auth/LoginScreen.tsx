import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { JuvQLogo } from '../../components/JuvQLogo';
import { JuvPillInput } from '../../components/JuvPillInput';
import { JuvShapes } from '../../components/JuvShapes';
import { SparkleMotif } from '../../components/JuvMotifs';
import { useStore } from '../../store/useStore';
import { gamesApi } from '../../services/api';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  navigation: any;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freePrize, setFreePrize] = useState<number | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const login = useStore((s) => s.login);
  const loginWithGoogle = useStore((s) => s.loginWithGoogle);

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const accessToken = googleResponse.authentication?.accessToken;
      if (accessToken) {
        setGoogleLoading(true);
        loginWithGoogle(accessToken)
          .catch(() => setError('No se pudo iniciar sesión con Google.'))
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [googleResponse]);

  useEffect(() => {
    gamesApi.list({ limit: 20 })
      .then((res) => {
        const games: any[] = res.data?.data || [];
        const free = games.find((g) =>
          (g.status === 'PENDING' || g.status === 'LOBBY' || g.status === 'LIVE') &&
          (g.entryFee === 0 || !g.entryFee)
        );
        if (free?.prize) setFreePrize(free.prize);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      const user = useStore.getState().user;
      if (user?.role === 'ADMIN') {
        await useStore.getState().logout();
        setError('Esta cuenta es de administrador. Usa el panel web.');
        return;
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#5B21B6', '#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={1.1} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo block */}
          <View style={styles.logoBlock}>
            <JuvQLogo size={92} animated />
            <Text style={styles.brandName}>QTrivia</Text>
            <Text style={styles.peruLabel}>· PERÚ ·</Text>
            <Text style={styles.subtitle}>
              Trivia en vivo todos los días.{'\n'}
              <Text style={styles.prizeHighlight}>S/{freePrize ?? 100}</Text>
              <Text style={styles.subtitleRest}> de premio · entrada gratis.</Text>
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 10, flexDirection: 'row', gap: 4 }}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>¿No tienes cuenta?</Text>
              <Text style={styles.footerLink}>Crea tu cuenta →</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <JuvPillInput
              placeholder="Usuario o correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              returnKeyType="next"
            />
            <JuvPillInput
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('Recover')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu clave?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* CTA */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={loading ? 1 : 0.85}
              disabled={loading}
              style={styles.ctaButton}
            >
              {loading ? (
                <ActivityIndicator color="#1F0A2E" />
              ) : (
                <View style={styles.ctaInner}>
                  <SparkleMotif size={18} color="#1F0A2E" />
                  <Text style={styles.ctaText}>¡Vamos a jugar!</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtnLight, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                activeOpacity={0.8}
                onPress={() => promptGoogleAsync()}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#1F0A2E" size="small" />
                ) : (
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={{ width: 18, height: 18 }}
                  />
                )}
                <Text style={styles.socialTextDark}>Continuar con Google</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  logoBlock: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1.5,
    lineHeight: 40,
    marginTop: 12,
  },
  peruLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FACC15',
    letterSpacing: 6,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  prizeHighlight: {
    color: '#FACC15',
    fontWeight: '800',
  },
  subtitleRest: {
    color: 'rgba(255,255,255,0.85)',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 12,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
  },
  forgotText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaButton: {
    width: '100%',
    height: 60,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 10,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#1F0A2E',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtnLight: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnDark: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1F0A2E',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialTextDark: {
    color: '#1F0A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  socialTextLight: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    flexWrap: 'wrap',
  },
  footerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  footerLink: {
    color: '#FACC15',
    fontSize: 14,
    fontWeight: '900',
  },
});
