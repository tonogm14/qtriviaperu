import React, { useState } from 'react';
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
import { Colors } from '../../theme/colors';
import { useStore } from '../../store/useStore';
import { authApi } from '../../services/api';

interface Props {
  navigation: any;
}

export const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { user, loadUser } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await authApi.updateMe({ name: name.trim(), phone: phone.trim() });
      await loadUser();
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al guardar los cambios.');
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
      <JuvShapes density={0.7} seed={0} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Editar perfil</Text>
            <Text style={styles.subtitle}>
              Actualiza tu información personal
            </Text>
          </View>

          {/* Avatar preview */}
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={[Colors.purple, Colors.purpleDark]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {name.split(' ').map((n) => n[0]).join('').toUpperCase() || '?'}
              </Text>
            </LinearGradient>
            <Text style={styles.avatarHint}>@{user?.username}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>NOMBRE COMPLETO</Text>
            <JuvPillInput
              placeholder="Tu nombre completo"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>TELÉFONO (Yape / Plin)</Text>
            <JuvPillInput
              placeholder="9XXXXXXXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            {/* Read-only info */}
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Correo electrónico</Text>
              <Text style={styles.readOnlyValue}>{user?.email}</Text>
            </View>

            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Nombre de usuario</Text>
              <Text style={styles.readOnlyValue}>@{user?.username}</Text>
            </View>

            {/* Error / success messages */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            {success ? (
              <Text style={styles.successText}>¡Cambios guardados!</Text>
            ) : null}

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={loading ? 1 : 0.85}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              <LinearGradient
                colors={[Colors.yellow, Colors.yellowDark]}
                style={styles.ctaButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textOnYellow} />
                ) : (
                  <Text style={styles.ctaText}>Guardar cambios</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  backIcon: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    marginTop: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.yellow,
    marginBottom: 10,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '900',
  },
  avatarHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },
  readOnlyField: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  readOnlyLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  readOnlyValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  successText: {
    color: Colors.green,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  ctaButton: {
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    color: Colors.textOnYellow,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
