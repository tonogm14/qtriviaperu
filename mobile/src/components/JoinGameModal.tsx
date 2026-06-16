import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';
import { gamesApi } from '../services/api';

interface Props {
  visible: boolean;
  game: any;
  onClose: () => void;
  onJoined: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatScheduledTime(dt: string | null): string {
  if (!dt) return '';
  const d = new Date(dt);
  const h = d.getHours() % 12 || 12;
  const m = pad(d.getMinutes());
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  const isToday = d.toDateString() === new Date().toDateString();
  return `${isToday ? 'Hoy' : 'Mañana'} · ${h}:${m} ${ampm}`;
}

function CountdownPill({ target }: { target: number }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((target - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (secs <= 0) return <Text style={styles.statValue}>¡Ya!</Text>;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const label = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return <Text style={styles.statValue}>{label}</Text>;
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke="#34D399"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const JoinGameModal: React.FC<Props> = ({
  visible,
  game,
  onClose,
  onJoined,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const prize = game?.prize ?? 100;
  const playerCount = game?._count?.entries ?? 0;
  const target = game?.scheduledAt ? new Date(game.scheduledAt).getTime() : Date.now() + 3600000;

  const rules = [
    'Inscripciones cierran 1 minuto antes',
    'Registro completamente gratis',
    'Si fallas una pregunta quedas eliminado',
    'El premio se entrega al ganador',
  ];

  const handleJoin = async () => {
    if (!game?.id) return;
    setLoading(true);
    setError('');
    try {
      await gamesApi.join(game.id);
      onJoined();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al unirse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dark blurred backdrop */}
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropHit} onPress={onClose} activeOpacity={1} />

        {/* Sheet */}
        <LinearGradient
          colors={['#1F0A2E', '#0B0414']}
          style={styles.sheet}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.sheetContent}
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Badge + time */}
            <View style={styles.topRow}>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>GRATIS</Text>
              </View>
              <Text style={styles.gameTime}>{formatScheduledTime(game?.scheduledAt)}</Text>
            </View>

            {/* Title */}
            <Text style={styles.gameTitle}>{game?.title || 'Trivia Gratis'}</Text>

            {/* Prize */}
            <View style={styles.prizeRow}>
              <Text style={styles.prizeLabel}>PREMIO</Text>
              <Text style={styles.prizeAmount}>S/{prize.toLocaleString()}</Text>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>JUGADORES</Text>
                <Text style={styles.statValue}>
                  {playerCount > 0 ? playerCount.toLocaleString() : '—'}
                </Text>
                <Text style={styles.statSub}>inscritos en vivo</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>EMPIEZA EN</Text>
                <CountdownPill target={target} />
                <Text style={styles.statSub}>estate listo</Text>
              </View>
            </View>

            {/* How it works */}
            <Text style={styles.sectionLabel}>CÓMO VA</Text>
            <Text style={styles.descText}>
              {`${game?.maxQuestions ?? 12} preguntas. ${game?.timePerQuestion ?? 10} segundos por respuesta. Registro completamente gratis. Responde correctamente para seguir en el juego.`}
            </Text>

            {/* Rules */}
            <Text style={styles.sectionLabel}>REGLAS</Text>
            {rules.map((r, i) => (
              <View key={i} style={styles.ruleRow}>
                <CheckIcon />
                <Text style={styles.ruleText}>{r}</Text>
              </View>
            ))}

            {/* CTA */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              onPress={handleJoin}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.ctaWrapper}
            >
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                style={styles.ctaBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.ctaText}>¡Registrarme gratis!</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity onPress={onClose} style={styles.dismissBtn} activeOpacity={0.6}>
              <Text style={styles.dismissText}>Después</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  },
  sheetContent: {
    padding: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  freeBadge: {
    backgroundColor: '#34D399',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeBadgeText: {
    color: '#1F0A2E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  gameTime: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  gameTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
  },
  prizeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    letterSpacing: 2,
  },
  prizeAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FACC15',
    letterSpacing: -1,
    textShadowColor: 'rgba(250,204,21,0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
    marginTop: 4,
  },
  descText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 18,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  ruleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 20,
  },
  noLivesBox: {
    padding: 16,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 14,
    marginTop: 18,
    marginBottom: 10,
  },
  noLivesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FCA5A5',
    marginBottom: 4,
  },
  noLivesBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
    marginBottom: 12,
  },
  buyLivesBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  buyLivesText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  ctaWrapper: {
    marginTop: 18,
  },
  ctaBtn: {
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 10,
  },
  ctaText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  dismissBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
});
