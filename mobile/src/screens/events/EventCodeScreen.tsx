import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { gamesApi } from '../../services/api';
import { useStore } from '../../store/useStore';

interface Props {
  navigation: any;
  route: { params?: { gameId?: string; game?: any } };
}

function fmt(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export const EventCodeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { gameId, game: gameProp } = route.params ?? {};
  const { setGameState } = useStore();

  const [game, setGame] = useState<any>(gameProp ?? null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(!gameProp);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameId) return;
    const load = async () => {
      try {
        if (!gameProp) {
          const r = await gamesApi.get(gameId);
          setGame(r.data?.data);
        }
        const entry = await gamesApi.getMyEntry(gameId);
        setAlreadyJoined(entry.data?.data?.joined === true);
      } catch {
        setAlreadyJoined(false);
      } finally {
        setChecking(false);
      }
    };
    load();
  }, [gameId, gameProp]);

  const handleEnter = () => {
    if (!game) return;
    if (game.status === 'LIVE') {
      setGameState('live');
      navigation.navigate('Live', { gameId: game.id });
    } else {
      setGameState('lobby');
      navigation.navigate('Lobby', { gameId: game.id, game });
    }
  };

  const handleValidate = async () => {
    if (!gameId || !code.trim()) {
      setError('Ingresa el código de acceso.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await gamesApi.join(gameId, code.trim().toUpperCase());
      setAlreadyJoined(true);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? '';
      const errCode = e?.response?.data?.code ?? '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('ya te') || errCode === 'ALREADY_JOINED') {
        setAlreadyJoined(true);
      } else if (errCode === 'INVALID_CODE') {
        setError('Código inválido. Verifica que lo copiaste correctamente.');
      } else if (errCode === 'CODE_ALREADY_USED') {
        setError('Este código ya fue usado por otra persona.');
      } else {
        setError('Código no válido. Contacta al organizador para obtener acceso.');
      }
    } finally {
      setLoading(false);
    }
  };

  const prize = game?.prize ?? 0;
  const isLive = game?.status === 'LIVE';

  return (
    <LinearGradient colors={['#1F0A2E', '#3B0764']} style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
          </View>

          {checking ? (
            <ActivityIndicator color="#FACC15" style={{ marginTop: 80 }} />
          ) : (
            <>
              {/* Event badge */}
              <View style={styles.eventBadge}>
                <Text style={styles.eventBadgeText}>EVENTO ESPECIAL</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>{game?.title ?? 'Evento Especial'}</Text>

              {/* Prize */}
              <View style={styles.prizeBox}>
                <Text style={styles.prizeLabel}>PREMIO</Text>
                <Text style={styles.prizeAmount}>
                  S/{prize.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                </Text>
              </View>

              {/* Description */}
              <Text style={styles.desc}>
                Competencia de conocimiento donde ganará el participante con mayor puntaje.
              </Text>

              {/* Date */}
              {game?.scheduledAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha</Text>
                  <Text style={styles.infoValue}>{fmt(game.scheduledAt)}</Text>
                </View>
              )}

              {/* Status */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Text style={[styles.infoValue, isLive && { color: '#34D399' }]}>
                  {isLive ? '🔴 En vivo' : alreadyJoined ? '✓ Acceso Habilitado' : 'Acceso Restringido'}
                </Text>
              </View>

              <View style={styles.divider} />

              {alreadyJoined ? (
                /* Already authorized */
                <TouchableOpacity onPress={handleEnter} style={styles.ctaWrapper} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#34D399', '#059669']}
                    style={styles.ctaBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.ctaText}>
                      {isLive ? '🔴 Entrar al evento' : '✓ Ingresar al lobby'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                /* Code input */
                <>
                  <Text style={styles.codeLabel}>CÓDIGO DE ACCESO</Text>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="Ingresa tu código"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={code}
                    onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={20}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <TouchableOpacity
                    onPress={handleValidate}
                    disabled={loading}
                    style={styles.ctaWrapper}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#A855F7', '#7C3AED']}
                      style={styles.ctaBtn}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      {loading
                        ? <ActivityIndicator color="white" />
                        : <Text style={styles.ctaText}>Validar Código</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                  <Text style={styles.helpText}>
                    El código de acceso es proporcionado por el organizador del evento.
                  </Text>
                </>
              )}
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 56, paddingBottom: 16 },
  backBtn: {},
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  eventBadge: {
    alignSelf: 'flex-start', marginBottom: 14,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 1, borderColor: '#A855F7',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5,
  },
  eventBadgeText: { color: '#A855F7', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: {
    fontSize: 30, fontWeight: '900', color: 'white',
    letterSpacing: -0.8, marginBottom: 20, lineHeight: 36,
  },
  prizeBox: { marginBottom: 16 },
  prizeLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)', marginBottom: 4,
  },
  prizeAmount: {
    fontSize: 40, fontWeight: '900', color: '#FACC15', letterSpacing: -1,
    textShadowColor: 'rgba(250,204,21,0.4)',
    textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12,
  },
  desc: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)',
    lineHeight: 22, marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  infoValue: { fontSize: 13, color: 'white', fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 24 },
  codeLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)', marginBottom: 10,
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 3,
    marginBottom: 16, textAlign: 'center',
  },
  errorText: {
    color: '#FCA5A5', fontSize: 13, fontWeight: '600',
    textAlign: 'center', marginBottom: 12,
  },
  ctaWrapper: { marginBottom: 16 },
  ctaBtn: {
    height: 58, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 8,
  },
  ctaText: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  helpText: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 18,
  },
});
