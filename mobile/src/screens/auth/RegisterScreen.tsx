import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvPillInput } from '../../components/JuvPillInput';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';
import { authApi, configApi } from '../../services/api';

interface Props {
  navigation: any;
}

// ─── Legal modal ──────────────────────────────────────────────────────────────

function LegalModal({
  visible,
  title,
  onClose,
  fetchContent,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  fetchContent: () => Promise<string>;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const text = await fetchContent();
      setContent(text || 'Contenido no disponible.');
    } catch {
      setContent('No se pudo cargar el contenido. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, [visible, fetchContent]);

  React.useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={modal.backdrop}>
        <TouchableOpacity style={modal.backdropHit} onPress={onClose} activeOpacity={1} />
        <LinearGradient
          colors={['#1F0A2E', '#0B0414']}
          style={modal.sheet}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={modal.handle} />
          <View style={modal.header}>
            <Text style={modal.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={modal.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color="#A855F7" style={{ marginTop: 40 }} />
            ) : (
              <Text style={modal.text}>{content}</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={modal.cta} onPress={onClose} activeOpacity={0.85}>
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              style={modal.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={modal.ctaText}>Entendido</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// ─── Register screen ──────────────────────────────────────────────────────────

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const register = useStore((s) => s.register);

  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailError('');
    if (emailTimer.current) clearTimeout(emailTimer.current);
    const trimmed = val.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await authApi.check({ email: trimmed });
        if (res.data.data.emailTaken) setEmailError('Este correo ya está en uso.');
      } catch {}
    }, 600);
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setUsernameError('');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const trimmed = val.trim();
    if (trimmed.length < 3) return;
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await authApi.check({ username: trimmed });
        if (res.data.data.usernameTaken) setUsernameError('Este nombre de usuario ya está en uso.');
      } catch {}
    }, 600);
  };

  const canSubmit = !!(
    name && email && username && password && termsAccepted && !loading && !emailError && !usernameError
  );

  const handleRegister = async () => {
    if (!canSubmit) return;

    // Client-side validation before hitting the API
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Ingresa un correo válido (ej: usuario@gmail.com).');
      return;
    }
    if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    setPasswordError('');
    try {
      await register(name.trim(), email.trim(), username.trim(), password);
    } catch (e: any) {
      const details: { field: string; message: string }[] = e?.response?.data?.details ?? [];
      const emailDetail = details.find((d) => d.field === 'email');
      const passDetail  = details.find((d) => d.field === 'password');
      const userDetail  = details.find((d) => d.field === 'username');

      if (emailDetail)  { setEmailError('Ingresa un correo válido (ej: usuario@gmail.com).'); return; }
      if (passDetail)   { setPasswordError('La contraseña debe tener al menos 8 caracteres.'); return; }
      if (userDetail)   { setUsernameError('El usuario solo puede tener letras, números y guión bajo.'); return; }

      setError(
        e?.response?.data?.error === 'Validation error'
          ? 'Revisá los campos e intentá de nuevo.'
          : e?.response?.data?.error || 'Error al crear la cuenta. El usuario o correo puede estar en uso.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = useCallback(async () => {
    const res = await configApi.getTerms();
    return res.data.data.termsAndConditions;
  }, []);

  const fetchPrivacy = useCallback(async () => {
    const res = await configApi.getPrivacy();
    return res.data.data.privacyPolicy;
  }, []);

  return (
    <LinearGradient
      colors={['#5B21B6', '#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.7} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Únete a la{'\n'}
              <Text style={styles.titleHighlight}>causa, causa</Text>
            </Text>
            <Text style={styles.subtitle}>1 vida gratis por registrarte.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <JuvPillInput
              placeholder="Tu nombre"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
            <JuvPillInput
              placeholder="Correo"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <JuvPillInput
              placeholder="Usuario (cómo te van a ver)"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              returnKeyType="next"
            />
            {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}

            <JuvPillInput
              placeholder="Contraseña (mínimo 8 caracteres)"
              value={password}
              onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
              secureTextEntry
              returnKeyType="done"
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

            {/* Terms + Privacy checkbox */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={[styles.checkbox, termsAccepted && styles.checkboxActive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                Confirmo que soy mayor de edad y acepto los{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
                  términos y condiciones
                </Text>
                {' '}y la{' '}
                <Text style={styles.termsLink} onPress={() => setShowPrivacy(true)}>
                  política de privacidad
                </Text>
                .
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* CTA */}
            <TouchableOpacity
              onPress={handleRegister}
              activeOpacity={canSubmit ? 0.85 : 1}
              disabled={!canSubmit}
              style={[styles.ctaButton, !canSubmit && styles.ctaDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#1F0A2E" />
              ) : (
                <Text style={styles.ctaText}>Crear cuenta y jugar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalModal
        visible={showTerms}
        title="Términos y condiciones"
        onClose={() => setShowTerms(false)}
        fetchContent={fetchTerms}
      />
      <LegalModal
        visible={showPrivacy}
        title="Política de privacidad"
        onClose={() => setShowPrivacy(false)}
        fetchContent={fetchPrivacy}
      />
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
    overflow: 'visible',
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
  fieldError: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 6,
    marginLeft: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#FACC15',
    borderColor: '#FACC15',
  },
  checkmark: {
    color: '#1F0A2E',
    fontSize: 13,
    fontWeight: '900',
  },
  termsText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  termsLink: {
    color: '#FACC15',
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
});

const modal = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,4,20,0.65)',
  },
  backdropHit: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.3,
  },
  close: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  body: {
    padding: 24,
    flex: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
  },
  cta: {
    margin: 20,
    marginTop: 12,
  },
  ctaGradient: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  ctaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
