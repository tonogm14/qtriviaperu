import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { SparkleMotif } from '../../components/JuvMotifs';
import { JoinGameModal } from '../../components/JoinGameModal';
import { useStore } from '../../store/useStore';
import { gamesApi } from '../../services/api';

interface Props {
  navigation: any;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const UpcomingScreen: React.FC<Props> = ({ navigation }) => {
  const { loadUser } = useStore();
  const [game, setGame] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const res = await gamesApi.list();
      const games: any[] = res.data.data || [];
      const next = games.find(
        (g) =>
          (g.status === 'PENDING' || g.status === 'LOBBY') &&
          (g.entryFee === 0 || !g.entryFee)
      );
      if (next) {
        setGame(next);
        gamesApi.getMyEntry(next.id)
          .then((r) => setIsJoined(r.data.data.joined))
          .catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadUser();
    load();
  }, [loadUser, load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = game?.scheduledAt ? new Date(game.scheduledAt).getTime() : 0;
  const totalSecs = target > 0 ? Math.max(0, Math.floor((target - now) / 1000)) : 0;
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const started = target > 0 && now >= target;
  const hasData = target > 0;

  const handleJoined = async () => {
    setIsJoined(true);
    setShowModal(false);
    await loadUser();
  };

  return (
    <LinearGradient
      colors={['#5B21B6', '#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={1.1} seed={7} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Dashboard')}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>EN VIVO PRONTO</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroLabelRow}>
          <SparkleMotif size={13} color="#FACC15" />
          <Text style={styles.heroLabel}>SIGUIENTE PARTIDA</Text>
        </View>

        <Text style={styles.prize}>
          S/{(game?.prize ?? 100).toLocaleString()}
        </Text>
        <Text style={styles.prizeSub}>de premio · entrada gratis</Text>
      </View>

      {/* Big countdown */}
      <View style={styles.countdownSection}>
        <Text style={styles.countdownTitle}>EMPIEZA EN</Text>

        {!hasData && (
          <Text style={styles.dimText}>Cargando...</Text>
        )}

        {hasData && started && (
          <Text style={styles.startedText}>¡Ya empezó!</Text>
        )}

        {hasData && !started && (
          <View style={styles.countdownRow}>
            {hours > 0 && (
              <>
                <View style={styles.countdownGroup}>
                  <Text style={styles.countdownNum}>{pad(hours)}</Text>
                  <Text style={styles.countdownUnit}>HRS</Text>
                </View>
                <Text style={styles.colon}>:</Text>
              </>
            )}
            <View style={styles.countdownGroup}>
              <Text style={styles.countdownNum}>{pad(mins)}</Text>
              <Text style={styles.countdownUnit}>MIN</Text>
            </View>
            <Text style={styles.colon}>:</Text>
            <View style={styles.countdownGroup}>
              <Text style={styles.countdownNum}>{pad(secs)}</Text>
              <Text style={styles.countdownUnit}>SEG</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom action */}
      <View style={styles.bottom}>
        {isJoined ? (
          <View style={styles.subscribedCard}>
            <View style={styles.subscribedLeft}>
              <LinearGradient
                colors={['#34D399', '#059669']}
                style={styles.checkCircle}
              >
                <Text style={styles.checkIcon}>✓</Text>
              </LinearGradient>
              <View>
                <Text style={styles.subscribedTitle}>Ya estás inscrito</Text>
                <Text style={styles.subscribedSub}>
                  {started ? '¡Ya empezó!' : 'Estamos por empezar'}
                </Text>
              </View>
            </View>
            {(started || game?.status === 'LOBBY') && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Lobby', { gameId: game.id })}
                style={styles.enterBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.enterBtnText}>Entrar →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : game ? (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FACC15', '#F59E0B']}
              style={styles.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>¡Anotarme! · 1 vida</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noGameText}>Sin próximos juegos por ahora</Text>
        )}
      </View>

      {game && (
        <JoinGameModal
          visible={showModal}
          game={game}
          onClose={() => setShowModal(false)}
          onJoined={handleJoined}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 0,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  hero: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 0,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FACC15',
    letterSpacing: 4,
  },
  prize: {
    fontSize: 68,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -3,
    lineHeight: 72,
    textShadowColor: 'rgba(250,204,21,0.35)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 24,
  },
  prizeSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    marginTop: 4,
  },

  countdownSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    marginBottom: 16,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  countdownGroup: {
    alignItems: 'center',
    minWidth: 84,
  },
  countdownNum: {
    fontSize: 92,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -4,
    lineHeight: 92,
    textShadowColor: 'rgba(250,204,21,0.35)',
    textShadowOffset: { width: 0, height: 12 },
    textShadowRadius: 32,
  },
  countdownUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginTop: 6,
  },
  colon: {
    fontSize: 76,
    fontWeight: '900',
    color: 'rgba(250,204,21,0.4)',
    lineHeight: 92,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  startedText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(52,211,153,0.3)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 16,
  },
  dimText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },

  bottom: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  subscribedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#34D399',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  subscribedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  subscribedTitle: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '900',
  },
  subscribedSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  enterBtn: {
    backgroundColor: '#34D399',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  enterBtnText: {
    color: '#1F0A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  cta: {
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 10,
  },
  ctaText: {
    color: '#1F0A2E',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  noGameText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 15,
    fontWeight: '600',
  },
});
