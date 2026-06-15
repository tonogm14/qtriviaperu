import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvPillInput } from '../../components/JuvPillInput';
import { JuvShapes } from '../../components/JuvShapes';
import { authApi } from '../../services/api';

interface Props {
  navigation: any;
}

export const RecoverScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.recover(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al enviar el enlace. Verifica tu correo.');
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
      <JuvShapes density={0.6} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          {!sent ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>
                  Tranqui,{'\n'}
                  <Text style={styles.titleHighlight}>la recuperamos</Text>
                </Text>
                <Text style={styles.subtitle}>Te mandamos un enlace al correo.</Text>
              </View>

              <View style={styles.form}>
                <JuvPillInput
                  placeholder="Tu correo"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleSend}
                  activeOpacity={email && !loading ? 0.85 : 1}
                  disabled={!email || loading}
                  style={[styles.ctaButton, (!email || loading) && styles.ctaDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="#1F0A2E" />
                  ) : (
                    <Text style={styles.ctaText}>Enviar enlace</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Text style={{ fontSize: 48 }}>📬</Text>
              </View>
              <Text style={styles.successTitle}>¡Enlace enviado!</Text>
              <Text style={styles.successSubtitle}>
                Revisa tu bandeja en{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={[styles.ctaButton, { marginTop: 32 }]}
              >
                <Text style={styles.ctaText}>Volver al inicio</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
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
  header: {
    marginTop: 20,
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1,
    lineHeight: 38,
  },
  titleHighlight: {
    color: '#FACC15',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
  },
  form: {},
  errorText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  ctaButton: {
    width: '100%',
    height: 60,
    marginTop: 16,
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
  ctaDisabled: {
    backgroundColor: 'rgba(250,204,21,0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: '#1F0A2E',
    fontSize: 17,
    fontWeight: '900',
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(250,204,21,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  successSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    color: '#FACC15',
    fontWeight: '700',
  },
});
