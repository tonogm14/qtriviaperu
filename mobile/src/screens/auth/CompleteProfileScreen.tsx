import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvPillInput } from '../../components/JuvPillInput';
import { JuvShapes } from '../../components/JuvShapes';
import { useStore } from '../../store/useStore';
import { authApi } from '../../services/api';

interface Props {
  navigation: any;
}

export const CompleteProfileScreen: React.FC<Props> = ({ navigation }) => {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const setNeedsProfileCompletion = useStore((s) => s.setNeedsProfileCompletion);

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [phone, setPhone] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setUsernameError('');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const trimmed = val.trim();
    if (trimmed.length < 3) return;
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await authApi.check({ username: trimmed });
        if (res.data.data.usernameTaken && trimmed !== user?.username) {
          setUsernameError('Este nombre de usuario ya está en uso.');
        }
      } catch {}
    }, 600);
  };

  const canSubmit = !!(name.trim() && username.trim() && phone.trim() && !loading && !usernameError);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const trimmedPhone = phone.trim();
    if (trimmedPhone.length < 7) {
      setPhoneError('Ingresa un número de teléfono válido.');
      return;
    }

    setLoading(true);
    setError('');
    setPhoneError('');
    try {
      const res = await authApi.updateMe({
        name: name.trim(),
        phone: trimmedPhone,
        username: username.trim() !== user?.username ? username.trim() : undefined,
      });
      const updatedUser = res.data.data;
      setUser(updatedUser);
      setNeedsProfileCompletion(false);
      navigation.replace('Dashboard');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Error al guardar. Intenta de nuevo.';
      if (msg.includes('usuario')) setUsernameError(msg);
      else setError(msg);
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
          <View style={styles.header}>
            <Text style={styles.title}>
              Un último{'\n'}
              <Text style={styles.titleHighlight}>paso, causa</Text>
            </Text>
            <Text style={styles.subtitle}>
              Completa tu perfil para poder jugar y recibir tus premios.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Tu nombre</Text>
            <JuvPillInput
              placeholder="Nombre completo"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

            <Text style={styles.label}>Usuario</Text>
            <JuvPillInput
              placeholder="Nombre de usuario"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              returnKeyType="next"
            />
            {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}

            <Text style={styles.label}>Teléfono</Text>
            <JuvPillInput
              placeholder="Ej: 987654321"
              value={phone}
              onChangeText={(v) => { setPhone(v); setPhoneError(''); }}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={canSubmit ? 0.85 : 1}
              disabled={!canSubmit}
              style={[styles.ctaButton, !canSubmit && styles.ctaDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#1F0A2E" />
              ) : (
                <Text style={styles.ctaText}>¡Listo, a jugar!</Text>
              )}
            </TouchableOpacity>
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
    paddingTop: 80,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 36,
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
    lineHeight: 20,
  },
  form: {},
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  fieldError: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 6,
    marginLeft: 4,
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
    marginTop: 24,
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
