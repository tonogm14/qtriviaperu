import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { JuvQLogo } from '../../components/JuvQLogo';
import { JuvShapes } from '../../components/JuvShapes';
import { SparkleMotif } from '../../components/JuvMotifs';
import { JoinGameModal } from '../../components/JoinGameModal';
import { useStore } from '../../store/useStore';
import { api, gamesApi } from '../../services/api';

interface Props {
  navigation: any;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatScheduledHero(dt: string | null): { date: string; time: string } {
  if (!dt) return { date: 'Próximamente', time: '' };
  const d = new Date(dt);
  // Compare and display in Lima timezone (UTC-5, no DST)
  const limaDate = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const todayLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const isToday = limaDate === todayLima;
  const limaTime = d.toLocaleTimeString('en-US', {
    timeZone: 'America/Lima',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return {
    date: isToday ? 'Hoy' : 'Mañana',
    time: limaTime,
  };
}

function formatTimeRemaining(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

const FG_PODIUM_COLORS = ['#FACC15', '#A855F7', '#EC4899', '#60A5FA', '#34D399'];
const FG_PODIUM_HEIGHTS = [50, 38, 30, 24, 20];

// ── Free game card (mirrors VIP card style) ────────────────────────────────────
function FreeGameCard({
  game, isJoined, freeStarted, freeRemain,
  onJoin, onEnterLobby,
}: {
  game: any; isJoined: boolean; freeStarted: boolean; freeRemain: number;
  onJoin: () => void; onEnterLobby: () => void;
}) {
  const prizeScale = useSharedValue(1);
  const prizeStyle = useAnimatedStyle(() => ({ transform: [{ scale: prizeScale.value }] }));

  useEffect(() => {
    const id = setInterval(() => {
      prizeScale.value = withSpring(1.04, { damping: 8 }, () => {
        prizeScale.value = withSpring(1, { damping: 8 });
      });
    }, 2400);
    return () => clearInterval(id);
  }, [prizeScale]);

  const prize: number = game.prize ?? 100;
  const wm: string = game.winnerMode ?? 'SINGLE';
  const slots: any[] = Array.isArray(game.prizeSlots) ? game.prizeSlots : [];

  const podium = (() => {
    if (wm === 'RANKED_SLOTS' && slots.length > 0) {
      const sorted = [...slots].sort((a: any, b: any) => a.place - b.place).slice(0, 5);
      const items = sorted.map((s: any, i: number) => ({
        p: s.place, pct: `${s.percent}%`,
        amt: Math.round(prize * s.percent / 100),
        h: FG_PODIUM_HEIGHTS[i] ?? 20, color: FG_PODIUM_COLORS[i] ?? '#60A5FA',
      }));
      if (items.length >= 3) return [items[1], items[0], items[2], ...items.slice(3)];
      if (items.length === 2) return [items[1], items[0]];
      return items;
    }
    if (wm === 'ALL_CORRECT') {
      return [{ p: 1, pct: '=', amt: prize, h: 50, color: '#FACC15', allCorrect: true }];
    }
    return [{ p: 1, pct: '100%', amt: prize, h: 50, color: '#FACC15' }];
  })();

  const scheduledTime = game.scheduledAt
    ? new Date(game.scheduledAt).toLocaleTimeString('en-US', {
        timeZone: 'America/Lima',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '6:00 PM';

  const fh = Math.floor(freeRemain / 3600);
  const fm = Math.floor((freeRemain % 3600) / 60);
  const fs = freeRemain % 60;

  return (
    <View style={fgStyles.card}>
      {/* glow blobs */}
      <View style={fgStyles.glowTop} />
      <View style={fgStyles.glowBottom} />
      <View style={{ position: 'absolute', top: 16, right: 18, opacity: 0.5 }}>
        <SparkleMotif size={14} color="#34D399" />
      </View>

      {/* header */}
      <View style={fgStyles.header}>
        <LinearGradient colors={['#059669', '#34D399']} style={fgStyles.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={fgStyles.badgeText}>TRIVIA GRATIS</Text>
        </LinearGradient>
        <Text style={fgStyles.timeText}>{scheduledTime}</Text>
      </View>

      {/* prize amount */}
      <View style={fgStyles.prizeSection}>
        <Text style={fgStyles.prizeLabel}>PREMIO</Text>
        <Animated.View style={prizeStyle}>
          <Text style={fgStyles.prizeAmount}>
            <Text style={fgStyles.prizeCurrency}>S/</Text>
            {prize.toLocaleString()}
          </Text>
        </Animated.View>
      </View>

      {/* prize details */}
      {(game.prizeTitle || game.prizeDescription || game.prizeImage) && (
        <View style={fgStyles.prizeDetails}>
          {game.prizeImage && (
            <Image
              source={{ uri: `${(api.defaults.baseURL ?? '').replace(/\/$/, '')}${game.prizeImage}` }}
              style={fgStyles.prizeDetailImg}
              resizeMode="cover"
            />
          )}
          {game.prizeTitle && (
            <Text style={fgStyles.prizeDetailTitle}>{game.prizeTitle}</Text>
          )}
          {game.prizeDescription && (
            <Text style={fgStyles.prizeDetailDesc}>{game.prizeDescription}</Text>
          )}
        </View>
      )}

      {/* podium — same as VIP */}
      {(podium[0] as any)?.allCorrect ? (
        <View style={{ paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
            Reparto igual entre todos los ganadores
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center' }}>
            Todos los que respondan todo bien se dividen el premio en partes iguales
          </Text>
        </View>
      ) : (
        <View style={fgStyles.podiumRow}>
          {podium.map((s: any) => (
            <View key={s.p} style={fgStyles.podiumCol}>
              <Text style={fgStyles.podiumAmt}>S/{s.amt.toLocaleString()}</Text>
              <Text style={fgStyles.podiumPct}>{s.pct}</Text>
              <View style={[fgStyles.podiumBar, { height: s.h, backgroundColor: s.color }, s.p === 1 && fgStyles.podiumBarFirst]}>
                <Text style={[fgStyles.podiumBarLabel, { color: s.p === 1 ? '#1F0A2E' : 'white' }]}>{s.p}°</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* countdown — hidden when game is already live */}
      {game?.status !== 'LIVE' && (
        <View style={fgStyles.countdown}>
          {[
            { v: pad(fh), l: 'HRS' },
            { v: pad(fm), l: 'MIN' },
            { v: pad(fs), l: 'SEG' },
          ].map((t, i) => (
            <React.Fragment key={i}>
              <View style={fgStyles.countdownUnit}>
                <Text style={fgStyles.countdownNum}>{t.v}</Text>
                <Text style={fgStyles.countdownLabel}>{t.l}</Text>
              </View>
              {i < 2 && <Text style={fgStyles.countdownColon}>:</Text>}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* CTA */}
      {game?.status === 'LIVE' && isJoined ? (
        <TouchableOpacity onPress={onEnterLobby} style={fgStyles.participarBtn} activeOpacity={0.85}>
          <View style={fgStyles.participarLeft}>
            <Text style={fgStyles.participarText}>🔴 Entrar al juego</Text>
          </View>
          <View style={fgStyles.participarBadge}>
            <Text style={fgStyles.participarBadgeText}>EN CURSO</Text>
          </View>
        </TouchableOpacity>
      ) : game?.status === 'LIVE' && !isJoined ? (
        <TouchableOpacity onPress={onJoin} style={fgStyles.participarBtn} activeOpacity={0.85}>
          <View style={fgStyles.participarLeft}>
            <Text style={fgStyles.participarText}>🔴 AHORA EN VIVO · Únete</Text>
          </View>
          <View style={fgStyles.participarBadge}>
            <Text style={fgStyles.participarBadgeText}>GRATIS</Text>
          </View>
        </TouchableOpacity>
      ) : isJoined ? (
        <View style={[fgStyles.participarBtn, fgStyles.participarJoined]}>
          <View style={fgStyles.participarLeft}>
            <Text style={[fgStyles.participarText, { color: '#34D399' }]}>✓ Ya estás inscrito</Text>
          </View>
          {(freeStarted || game?.status === 'LOBBY') ? (
            <TouchableOpacity onPress={onEnterLobby} activeOpacity={0.85}
              style={[fgStyles.participarBadge, { backgroundColor: '#34D399' }]}>
              <Text style={[fgStyles.participarBadgeText, { color: '#0A2E1A' }]}>Entrar →</Text>
            </TouchableOpacity>
          ) : (
            <View style={[fgStyles.participarBadge, { backgroundColor: 'rgba(52,211,153,0.2)' }]}>
              <Text style={[fgStyles.participarBadgeText, { color: '#34D399' }]}>GRATIS</Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity onPress={onJoin} style={fgStyles.participarBtn} activeOpacity={0.85}>
          <View style={fgStyles.participarLeft}>
            <Text style={fgStyles.participarText}>Participar</Text>
          </View>
          <View style={fgStyles.participarBadge}>
            <Text style={fgStyles.participarBadgeText}>GRATIS</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const fgStyles = StyleSheet.create({
  card: {
    borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(60,38,0,0.75)',
    borderWidth: 1.5, borderColor: 'rgba(250,204,21,0.2)',
    padding: 18, marginBottom: 16,
    shadowColor: '#FACC15', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15, shadowRadius: 40, elevation: 10,
    position: 'relative',
  },
  glowTop: {
    position: 'absolute', top: -40, right: -40,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(250,204,21,0.15)', opacity: 0.5,
  },
  glowBottom: {
    position: 'absolute', bottom: -30, left: -30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(251,146,60,0.12)', opacity: 0.5,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  timeText: { color: 'white', fontSize: 12, fontWeight: '800' },
  prizeSection: { alignItems: 'center', paddingVertical: 6 },
  prizeLabel: { fontSize: 11, fontWeight: '800', color: '#34D399', letterSpacing: 4 },
  prizeAmount: {
    fontSize: 56, fontWeight: '900', color: 'white', letterSpacing: -2, lineHeight: 64, marginTop: 2,
    textShadowColor: 'rgba(52,211,153,0.4)', textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 24,
  },
  prizeCurrency: { fontSize: 26, fontWeight: '800', opacity: 0.7 },
  podiumRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  podiumCol: { flex: 1, alignItems: 'center' },
  podiumAmt: { fontSize: 11, fontWeight: '800', color: 'white', marginBottom: 3 },
  podiumPct: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  podiumBar: {
    width: '100%', borderRadius: 8,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  podiumBarFirst: {
    shadowColor: '#FACC15', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 4,
  },
  podiumBarLabel: { fontSize: 14, fontWeight: '900' },
  countdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, marginVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.32)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  countdownUnit: { alignItems: 'center', minWidth: 40 },
  countdownNum: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  countdownLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 },
  countdownColon: { fontSize: 24, fontWeight: '900', color: 'rgba(52,211,153,0.5)', alignSelf: 'flex-start', marginTop: 2 },
  participarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FACC15',
    paddingHorizontal: 20,
    marginTop: 14,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 10,
  },
  participarJoined: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1.5,
    borderColor: '#34D399',
    shadowColor: '#34D399',
    shadowOpacity: 0.3,
    elevation: 4,
  },
  participarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participarText: {
    color: '#1F0A2E',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  participarBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1F0A2E',
    borderRadius: 999,
  },
  participarBadgeText: {
    color: '#FACC15',
    fontSize: 13,
    fontWeight: '900',
  },
  prizeDetails: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 10, marginTop: 4, marginBottom: 4,
  },
  prizeDetailImg: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  prizeDetailTitle: { color: 'white', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  prizeDetailDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 17 },
});

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useTabBarHeight();
  const { connectedCount, rank, setGameState, loadUser, setHasLiveGame } = useStore();

  const [freeGame, setFreeGame] = useState<any>(null);
  const [vipGame, setVipGame] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isVipJoined, setIsVipJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [now, setNow] = useState(Date.now());

  const loadGames = useCallback(async () => {
    try {
      const res = await gamesApi.list({ limit: 100 });
      const games: any[] = res.data?.data || [];
      console.log('[Dashboard] games:', games.length, games.map((g: any) => `${g.title}|${g.status}|fee=${g.entryFee}`));

      const nextFree = games.find(
        (g) => (g.status === 'PENDING' || g.status === 'LOBBY' || g.status === 'LIVE') && (g.entryFee === 0 || !g.entryFee)
      );
      const nextVip = games.find(
        (g) => (g.status === 'PENDING' || g.status === 'LOBBY' || g.status === 'LIVE') && g.entryFee > 0
      );

      const anyLive = games.some((g) => g.status === 'LIVE');
      setHasLiveGame(anyLive);

      if (nextFree) {
        setFreeGame(nextFree);
        // Check if user is already joined
        try {
          const entryRes = await gamesApi.getMyEntry(nextFree.id);
          setIsJoined(entryRes.data.data.joined);
        } catch {
          setIsJoined(false);
        }
      }

      if (nextVip) {
        setVipGame(nextVip);
        try {
          const vipEntry = await gamesApi.getMyEntry(nextVip.id);
          setIsVipJoined(vipEntry.data.data.joined);
        } catch {
          setIsVipJoined(false);
        }
      }
    } catch (err: any) {
      console.error('[Dashboard] loadGames error:', err?.message, err?.response?.data);
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadGames();
  }, [loadUser, loadGames]);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // VIP countdown
  const vipTarget = vipGame?.scheduledAt
    ? new Date(vipGame.scheduledAt).getTime()
    : (() => {
      const t = new Date();
      t.setHours(21, 0, 0, 0);
      if (t.getTime() < Date.now()) t.setDate(t.getDate() + 1);
      return t.getTime();
    })();
  const vipRemain = Math.max(0, Math.floor((vipTarget - now) / 1000));
  const rh = Math.floor(vipRemain / 3600);
  const rm = Math.floor((vipRemain % 3600) / 60);
  const rs = vipRemain % 60;

  // Free game countdown (to scheduledAt)
  const freeTarget = freeGame?.scheduledAt ? new Date(freeGame.scheduledAt).getTime() : 0;
  const freeRemain = freeTarget > 0 ? Math.max(0, Math.floor((freeTarget - now) / 1000)) : 0;
  const freeStarted = freeTarget > 0 && now >= freeTarget;

  // Hero shows whichever game (free or VIP) comes soonest
  const nextHeroGame = [freeGame, vipGame]
    .filter(Boolean)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;
  const heroScheduled = formatScheduledHero(nextHeroGame?.scheduledAt ?? null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUser(), loadGames()]);
    setRefreshing(false);
  }, [loadUser, loadGames]);

  const handleJoined = async () => {
    setIsJoined(true);
    setShowJoinModal(false);
    await loadUser();
  };

  const handleEnterLobby = () => {
    if (freeGame?.status === 'LIVE') {
      setGameState('live');
      navigation.navigate('Live', { gameId: freeGame.id, streamUrl: freeGame.streamUrl || null });
    } else {
      setGameState('lobby');
      navigation.navigate('Lobby', freeGame ? { gameId: freeGame.id, game: freeGame } : undefined);
    }
  };

  // ── VIP prize display ────────────────────────────────────────────
  const vipDisplayPrize = (() => {
    if (!vipGame) return 0;
    if (vipGame.prizeMode === 'POT_PERCENT') {
      return Math.round((vipGame.currentPot ?? 0) * (vipGame.potPercent ?? 100) / 100);
    }
    if (vipGame.prizeMode === 'POT' || !vipGame.prizeMode) return vipGame.currentPot ?? 0;
    return vipGame.prize ?? 0; // FIXED
  })();

  // ── Build podium from prizeSlots or winnerMode ──────────────────
  const PODIUM_COLORS = ['#FACC15', '#A855F7', '#EC4899', '#60A5FA', '#34D399'];
  const PODIUM_HEIGHTS = [50, 38, 30, 24, 20];

  const podium = (() => {
    const prize = vipDisplayPrize;
    const wm = vipGame?.winnerMode ?? 'SINGLE';
    const slots: any[] = Array.isArray(vipGame?.prizeSlots) ? vipGame.prizeSlots : [];

    if (wm === 'RANKED_SLOTS' && slots.length > 0) {
      const sorted = [...slots].sort((a, b) => a.place - b.place).slice(0, 5);
      const items = sorted.map((s, i) => ({
        p: s.place, pct: `${s.percent}%`,
        amt: Math.round(prize * s.percent / 100),
        h: PODIUM_HEIGHTS[i] ?? 20, color: PODIUM_COLORS[i] ?? '#60A5FA',
      }));
      // visual order: 2nd, 1st, 3rd, 4th, 5th
      if (items.length >= 3) return [items[1], items[0], items[2], ...items.slice(3)];
      if (items.length === 2) return [items[1], items[0]];
      return items;
    }
    if (wm === 'ALL_CORRECT') {
      return [{ p: 1, pct: '=', amt: prize, h: 50, color: '#FACC15', allCorrect: true }];
    }
    // SINGLE — 1 winner
    return [{ p: 1, pct: '100%', amt: prize, h: 50, color: '#FACC15' }];
  })();

  return (
    <LinearGradient
      colors={['#5B21B6', '#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={1} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FACC15"
            colors={['#FACC15']}
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          {connectedCount > 0 && (
            <View style={styles.connectedBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.connectedText}>
                {connectedCount.toLocaleString()}
                <Text style={styles.connectedSub}> jugando</Text>
              </Text>
            </View>
          )}
          <JuvQLogo size={42} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLabel}>
            <SparkleMotif size={14} color="#FACC15" />
            <Text style={styles.heroLabelText}>SIGUIENTE PARTIDA</Text>
          </View>
          <Text style={styles.heroTime}>
            {heroScheduled.date}
            {heroScheduled.time ? `\n${heroScheduled.time}` : ''}
          </Text>
          <Text style={styles.heroSub}>
            {nextHeroGame
              ? `${nextHeroGame.maxQuestions ?? 12} preguntas · Premio S/${nextHeroGame.prize}`
              : '12 preguntas · Premio S/100'}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: '#FACC15' }]}>
              {rank > 0 ? `#${rank}` : '—'}
            </Text>
            <Text style={styles.statLabel}>RANK</Text>
          </View>
        </View>

        {/* Free game card */}
        {freeGame && (
          <FreeGameCard
            game={freeGame}
            isJoined={isJoined}
            freeStarted={freeStarted}
            freeRemain={freeRemain}
            onJoin={() => setShowJoinModal(true)}
            onEnterLobby={handleEnterLobby}
          />
        )}

        {/* VIP Card */}
        <View style={styles.vipCard}>
          <View style={styles.vipGlowTop} />
          <View style={styles.vipGlowBottom} />
          <View style={styles.vipSparkle1}>
            <SparkleMotif size={16} color="#FACC15" />
          </View>
          <View style={styles.vipSparkle2}>
            <SparkleMotif size={10} color="#F472B6" />
          </View>

          <View style={styles.vipHeader}>
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              style={styles.vipBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.vipBadgeText}>EVENTO ESPECIAL</Text>
            </LinearGradient>
            <Text style={styles.vipTime}>
              {vipGame?.scheduledAt
                ? new Date(vipGame.scheduledAt).toLocaleTimeString('en-US', {
                    timeZone: 'America/Lima',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '9:00 PM'}
            </Text>
          </View>

          <View style={styles.boteSection}>
            <Text style={styles.boteLabel}>
              {vipGame?.prizeMode === 'FIXED' ? 'PREMIO FIJO' : 'BOTE A REPARTIR'}
            </Text>
            <View>
              <Text style={styles.boteAmount}>
                <Text style={styles.boteCurrency}>S/</Text>
                {vipDisplayPrize.toLocaleString()}
              </Text>
            </View>
            {vipGame?.prizeMode === 'POT' && (
              <View style={styles.boteIncr}>
                <View style={styles.boteIncrDot} />
                <Text style={styles.boteIncrText}>Premio acumulado del evento</Text>
              </View>
            )}
          </View>

          {/* prize details */}
          {(vipGame?.prizeTitle || vipGame?.prizeDescription || vipGame?.prizeImage) && (
            <View style={styles.prizeDetails}>
              {vipGame?.prizeImage && (
                <Image
                  source={{ uri: `${(api.defaults.baseURL ?? '').replace(/\/$/, '')}${vipGame.prizeImage}` }}
                  style={styles.prizeDetailImg}
                  resizeMode="cover"
                />
              )}
              {vipGame?.prizeTitle && (
                <Text style={styles.prizeDetailTitle}>{vipGame.prizeTitle}</Text>
              )}
              {vipGame?.prizeDescription && (
                <Text style={styles.prizeDetailDesc}>{vipGame.prizeDescription}</Text>
              )}
            </View>
          )}

          {(podium[0] as any)?.allCorrect ? (
            <View style={{ paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
                Reparto igual entre todos los ganadores
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center' }}>
                Todos los que respondan todo bien se dividen el premio en partes iguales
              </Text>
            </View>
          ) : (
            <View style={styles.podiumRow}>
              {podium.map((s: any) => (
                <View key={s.p} style={styles.podiumCol}>
                  <Text style={styles.podiumAmt}>S/{s.amt.toLocaleString()}</Text>
                  <Text style={styles.podiumPct}>{s.pct}</Text>
                  <View
                    style={[
                      styles.podiumBar,
                      { height: s.h, backgroundColor: s.color },
                      s.p === 1 && styles.podiumBarFirst,
                    ]}
                  >
                    <Text style={[styles.podiumBarLabel, { color: s.p === 1 ? '#1F0A2E' : 'white' }]}>
                      {s.p}°
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {vipGame?.status !== 'LIVE' && (
            <View style={styles.countdown}>
              {[
                { v: pad(rh), l: 'HRS' },
                { v: pad(rm), l: 'MIN' },
                { v: pad(rs), l: 'SEG' },
              ].map((t, i) => (
                <React.Fragment key={i}>
                  <View style={styles.countdownUnit}>
                    <Text style={styles.countdownNum}>{t.v}</Text>
                    <Text style={styles.countdownLabel}>{t.l}</Text>
                  </View>
                  {i < 2 && <Text style={styles.countdownColon}>:</Text>}
                </React.Fragment>
              ))}
            </View>
          )}

          {vipGame?.status === 'LIVE' && isVipJoined ? (
            <TouchableOpacity
              onPress={() => { setGameState('live'); navigation.navigate('Live', { gameId: vipGame.id, streamUrl: vipGame.streamUrl || null }); }}
              style={styles.participarBtn}
              activeOpacity={0.85}
            >
              <View style={styles.participarLeft}>
                <Text style={styles.participarText}>🔴 Entrar al juego VIP</Text>
              </View>
              <View style={styles.participarBadge}>
                <Text style={styles.participarBadgeText}>EN CURSO</Text>
              </View>
            </TouchableOpacity>
          ) : vipGame?.status === 'LIVE' && !isVipJoined ? (
            <TouchableOpacity
              onPress={() => { setGameState('live'); navigation.navigate('Live', { gameId: vipGame.id, streamUrl: vipGame.streamUrl || null }); }}
              style={styles.participarBtn}
              activeOpacity={0.85}
            >
              <View style={styles.participarLeft}>
                <Text style={styles.participarText}>🔴 Ver en vivo</Text>
              </View>
              <View style={styles.participarBadge}>
                <Text style={styles.participarBadgeText}>EN VIVO</Text>
              </View>
            </TouchableOpacity>
          ) : isVipJoined ? (
            <View style={[styles.participarBtn, styles.participarJoined]}>
              <View style={styles.participarLeft}>
                <Text style={[styles.participarText, { color: '#34D399' }]}>✓ Acceso Habilitado</Text>
              </View>
              <View style={[styles.participarBadge, { backgroundColor: 'rgba(52,211,153,0.2)' }]}>
                <Text style={[styles.participarBadgeText, { color: '#34D399' }]}>INSCRITO</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('EventCode', vipGame ? { gameId: vipGame.id, game: vipGame } : undefined)}
              style={styles.participarBtn}
              activeOpacity={0.85}
            >
              <View style={styles.participarLeft}>
                <SparkleMotif size={16} color="#1F0A2E" />
                <Text style={styles.participarText}>Ver Detalles</Text>
              </View>
              <View style={styles.participarBadge}>
                <Text style={styles.participarBadgeText}>ACCESO RESTRINGIDO</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Join modal */}
      <JoinGameModal
        visible={showJoinModal}
        game={freeGame}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleJoined}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  connectedText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  connectedSub: {
    color: 'white',
    fontWeight: '600',
    opacity: 0.6,
  },
  hero: {
    marginBottom: 28,
  },
  heroLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  heroLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FACC15',
    letterSpacing: 4,
  },
  heroTime: {
    fontSize: 46,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -2,
    lineHeight: 48,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 10,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  statCellEmpty: {
    borderColor: 'rgba(236,72,153,0.25)',
    borderStyle: 'dashed',
  },
  statLabelBuy: {
    fontSize: 11,
    color: '#EC4899',
    fontWeight: '800',
    marginTop: 4,
  },
  // Subscribed badge
  subscribedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#34D399',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 14,
  },
  subscribedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subscribedCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribedCheckIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  subscribedTextCol: {
    flex: 1,
  },
  subscribedTitle: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '900',
  },
  subscribedSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  enterBtn: {
    backgroundColor: '#34D399',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  enterBtnText: {
    color: '#1F0A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  // Free CTA
  freeCta: {
    width: '100%',
    height: 60,
    borderRadius: 999,
    backgroundColor: '#FACC15',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 14,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 10,
  },
  freeCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freeCtaPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F0A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeCtaPlayIcon: {
    color: '#FACC15',
    fontSize: 14,
  },
  freeCtaText: {
    color: '#1F0A2E',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  freeCtaRight: {
    fontSize: 14,
    color: '#1F0A2E',
    fontWeight: '800',
    opacity: 0.85,
  },
  // VIP card
  vipCard: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#2D0A4F',
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.35)',
    padding: 18,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 56,
    elevation: 12,
    position: 'relative',
  },
  vipGlowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(250,204,21,0.35)',
    opacity: 0.4,
  },
  vipGlowBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(236,72,153,0.3)',
    opacity: 0.4,
  },
  vipSparkle1: { position: 'absolute', top: 16, right: 18, opacity: 0.5 },
  vipSparkle2: { position: 'absolute', top: 60, left: 16, opacity: 0.4 },
  vipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  vipBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
  },
  vipTime: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  boteSection: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  boteLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FACC15',
    letterSpacing: 4,
  },
  boteAmount: {
    fontSize: 56,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -2,
    lineHeight: 64,
    marginTop: 2,
    textShadowColor: 'rgba(250,204,21,0.4)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 24,
  },
  boteCurrency: {
    fontSize: 26,
    fontWeight: '800',
    opacity: 0.7,
  },
  boteIncr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  boteIncrDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  boteIncrText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '800',
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  podiumAmt: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
    marginBottom: 3,
  },
  podiumPct: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  podiumBar: {
    width: '100%',
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBarFirst: {
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  podiumBarLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 40,
  },
  countdownNum: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
  },
  countdownLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  countdownColon: {
    fontSize: 24,
    fontWeight: '900',
    color: 'rgba(250,204,21,0.5)',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  participarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FACC15',
    paddingHorizontal: 20,
    marginTop: 14,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 10,
  },
  participarJoined: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1.5,
    borderColor: '#34D399',
    shadowColor: '#34D399',
    shadowOpacity: 0.3,
    elevation: 4,
  },
  participarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participarText: {
    color: '#1F0A2E',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  participarBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1F0A2E',
    borderRadius: 999,
  },
  participarBadgeText: {
    color: '#FACC15',
    fontSize: 13,
    fontWeight: '900',
  },
  prizeDetails: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 10, marginTop: 4, marginBottom: 4,
  },
  prizeDetailImg: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  prizeDetailTitle: { color: 'white', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  prizeDetailDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 17 },
});
