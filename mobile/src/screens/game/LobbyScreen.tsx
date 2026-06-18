import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvQLogo } from '../../components/JuvQLogo';
import { JuvShapes } from '../../components/JuvShapes';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { JoinGameModal } from '../../components/JoinGameModal';
import { useStore } from '../../store/useStore';
import { gamesApi } from '../../services/api';
import {
  connectSocket,
  disconnectSocket,
  joinLobby,
  sendChat,
  onLobbyState,
  onLobbyUpdate,
  onPotUpdate,
  onChat,
  onGameCountdown,
  onGameFinish,
  offAll,
  newMsgId,
} from '../../services/socket';

interface Props {
  navigation: any;
  route: any;
}

const pad = (n: number) => String(n).padStart(2, '0');
const CHAT_UNLOCK_SECS = 600;
const SPR = { damping: 20, stiffness: 65 } as const;

export const LobbyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, chatMessages, addChatMessage, setGameState, incrementVipPot, loadUser } = useStore();
  const { height: SCREEN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [gameId, setGameId] = useState<string>(route?.params?.gameId || '');
  const [scheduledAt, setScheduledAt] = useState<string | undefined>(route?.params?.game?.scheduledAt ?? route?.params?.scheduledAt);
  const [game, setGame] = useState<any>(route?.params?.game ?? null);
  const [prize, setPrize] = useState<number>(route?.params?.game?.prize ?? route?.params?.prize ?? 100);
  const [streamUrl, setStreamUrl] = useState<string | null>(route?.params?.game?.streamUrl ?? route?.params?.streamUrl ?? null);

  const initCountdown = (sat?: string) => {
    if (!sat) return 3600;
    return Math.max(0, Math.floor((new Date(sat).getTime() - Date.now()) / 1000));
  };

  const [playerCount, setPlayerCount] = useState(0);
  const [countdown, setCountdown] = useState(() => initCountdown(route?.params?.scheduledAt));
  const [chatInput, setChatInput] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Auto-fetch next game when navigated from tab (no gameId passed)
  useEffect(() => {
    if (gameId) return;
    gamesApi.list().then((res) => {
      const games: any[] = res.data.data || [];

      // Any LIVE game (free or VIP) → go straight to live view
      const liveGame = games.find((g) => g.status === 'LIVE');
      if (liveGame) {
        setGameState('live');
        navigation.replace('Live', { gameId: liveGame.id, streamUrl: liveGame.streamUrl || null });
        return;
      }

      // Find the next upcoming game (free or special) sorted by scheduledAt
      const next = games
        .filter((g) => g.status === 'PENDING' || g.status === 'LOBBY')
        .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
      if (next) {
        setGameId(next.id);
        setScheduledAt(next.scheduledAt);
        setGame(next);
        setPrize(next.prize ?? 100);
        setCountdown(initCountdown(next.scheduledAt));
        setStreamUrl(next.streamUrl || null);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  // Check join status whenever gameId is known
  useEffect(() => {
    if (!gameId) return;
    gamesApi.getMyEntry(gameId)
      .then((res) => setIsJoined(res.data.data.joined))
      .catch(() => setIsJoined(false));
  }, [gameId]);

  // Poll game status every 30s — unlock chat when LOBBY/LIVE, navigate to Live if any game goes LIVE
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        // Check all games — a VIP game may go live while we're waiting in the free lobby
        const listRes = await gamesApi.list();
        const games: any[] = listRes.data.data || [];
        const liveGame = games.find((g) => g.status === 'LIVE');
        if (liveGame) {
          setGameState('live');
          navigation.replace('Live', { gameId: liveGame.id, streamUrl: liveGame.streamUrl || null });
          return;
        }
        // Update current game status (for chat unlock etc.)
        if (gameId) {
          const currentGame = games.find((g) => g.id === gameId);
          if (currentGame) {
            setGame((prev: any) => (prev?.status === currentGame.status ? prev : currentGame));
            setStreamUrl(currentGame.streamUrl || null);
          }
        }
      } catch {}
    }, 30_000);
    return () => clearInterval(poll);
  }, [gameId]); // eslint-disable-line

  const chatUnlocked = countdown <= CHAT_UNLOCK_SECS || game?.status === 'LOBBY' || game?.status === 'LIVE';
  const wasUnlocked = useRef(chatUnlocked);
  const fromSocketCountdown = useRef(false);

  // ── Animated values ──────────────────────────────────────────────
  // Countdown block slides from center to just below top bar
  const countdownTop = useSharedValue(chatUnlocked ? 120 : SCREEN_H * 0.28);

  // Middle content (logo + badges) fades in
  const midOpacity = useSharedValue(chatUnlocked ? 1 : 0);
  const midTransY = useSharedValue(chatUnlocked ? 0 : 28);

  // Chat section slides up from bottom
  const chatOpacity = useSharedValue(chatUnlocked ? 1 : 0);
  const chatTransY = useSharedValue(chatUnlocked ? 0 : 70);

  // Locked pill fades out
  const lockedOpacity = useSharedValue(chatUnlocked ? 0 : 1);

  useEffect(() => {
    if (chatUnlocked && !wasUnlocked.current) {
      countdownTop.value = withSpring(120, SPR);
      midOpacity.value = withDelay(260, withTiming(1, { duration: 480 }));
      midTransY.value = withDelay(260, withSpring(0, SPR));
      chatOpacity.value = withDelay(360, withTiming(1, { duration: 480 }));
      chatTransY.value = withDelay(360, withSpring(0, SPR));
      lockedOpacity.value = withTiming(0, { duration: 280 });
    }
    wasUnlocked.current = chatUnlocked;
  }, [chatUnlocked]); // eslint-disable-line

  const countdownStyle = useAnimatedStyle(() => ({ top: countdownTop.value }));
  const midStyle = useAnimatedStyle(() => ({
    opacity: midOpacity.value,
    transform: [{ translateY: midTransY.value }],
  }));
  const chatStyle = useAnimatedStyle(() => ({
    opacity: chatOpacity.value,
    transform: [{ translateY: chatTransY.value }],
  }));
  const lockedStyle = useAnimatedStyle(() => ({ opacity: lockedOpacity.value }));

  // ── Socket ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    const s = connectSocket();

    // Re-join room on every connect/reconnect (Socket.IO drops rooms on reconnect)
    const handleConnect = () => {
      if (user?.id) joinLobby(gameId, user.id);
    };
    s.on('connect', handleConnect);
    // Join immediately if already connected
    if (s.connected && user?.id) joinLobby(gameId, user.id);

    onLobbyState((data: any) => {
      if (data.playerCount !== undefined) setPlayerCount(data.playerCount);
      if (data.countdown !== undefined) setCountdown(data.countdown);
    });
    onLobbyUpdate((data: any) => {
      if (data.playerCount !== undefined) setPlayerCount(data.playerCount);
    });
    onPotUpdate((data: any) => {
      if (data.increment !== undefined) incrementVipPot(data.increment);
    });
    onChat((msg: any) => {
      // Skip own messages — already added locally in handleSendChat
      if (msg.senderId === user?.id) return;
      addChatMessage({
        id: newMsgId(),
        user: msg.user || 'Jugador',
        text: msg.message || msg.text || '',
        avatarColor: '#FACC15',
      });
    });

    // Host forced-start: server emits game:countdown (5…1) before questions begin
    onGameCountdown((data: any) => {
      fromSocketCountdown.current = true;
      setCountdown(data.seconds ?? 0);
    });

    // Game ended while user is still in the lobby — send everyone home
    onGameFinish(() => {
      offAll();
      disconnectSocket();
      setGameState('finished');
      navigation.replace('Dashboard');
    });

    return () => {
      s.off('connect', handleConnect);
      offAll();
      // Do NOT disconnect here — if navigating to LiveScreen the same socket is reused.
      // disconnectSocket() is only called when explicitly leaving to Dashboard.
    };
  }, [gameId, user?.id]);  // eslint-disable-line

  // ── Countdown tick — recompute from scheduledAt each second so both phones stay in sync ──
  useEffect(() => {
    fromSocketCountdown.current = false;
    const tick = () => {
      if (scheduledAt) {
        const remaining = Math.max(0, Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000));
        setCountdown(remaining);
      } else {
        setCountdown((p) => (p <= 1 ? 0 : p - 1));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  useEffect(() => {
    if (countdown === 0 && fromSocketCountdown.current) {
      setGameState('live');
      navigation.replace('Live', { gameId, streamUrl });
    }
  }, [countdown]); // eslint-disable-line

  const hours = Math.floor(countdown / 3600);
  const mins = Math.floor((countdown % 3600) / 60);
  const secs = countdown % 60;

  // ── Prize & winners display ──────────────────────────────────────
  const displayPrize = (() => {
    if (!game) return prize;
    if (game.prizeMode === 'POT_PERCENT') {
      return Math.round((game.currentPot ?? prize) * (game.potPercent ?? 100) / 100);
    }
    if (game.prizeMode === 'POT' || (!game.prizeMode && game.entryFee > 0)) {
      return game.currentPot ?? prize;
    }
    return game.prize ?? prize;
  })();

  const winnersLabel = (() => {
    if (!game) return null;
    const wm = game.winnerMode ?? 'SINGLE';
    const slots: any[] = Array.isArray(game.prizeSlots) ? game.prizeSlots : [];
    if (wm === 'ALL_CORRECT') return 'Se reparte entre todos los que completen';
    if (wm === 'RANKED_SLOTS' && slots.length > 0) {
      return slots.map((s: any) => `${s.place}° S/${Math.round(displayPrize * s.percent / 100)} (${s.percent}%)`).join('  ·  ');
    }
    return '1 ganador · premio completo';
  })();

  const defaultChats = [
    { id: '1', user: 'cristina', text: 'jajaja vamos por la 100', avatarColor: '#FACC15' },
    { id: '2', user: 'chad', text: 'me llevo este pe', avatarColor: '#EC4899' },
    { id: '3', user: 'sam20', text: '¡a darle!', avatarColor: '#A855F7' },
    { id: '4', user: 'alex', text: 'hola gente buena', avatarColor: '#34D399' },
    { id: '5', user: 'daniela', text: 'YA EMPIEZA YA', avatarColor: '#FACC15' },
  ];
  const displayChats = chatMessages.length > 0 ? chatMessages : defaultChats;

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    if (user?.id) sendChat(gameId, user.id, user.name || 'Jugador', chatInput.trim());
    addChatMessage({
      id: newMsgId(),
      user: user?.name || 'Tú',
      text: chatInput.trim(),
      avatarColor: '#FACC15',
    });
    setChatInput('');
  };

  return (
    <LinearGradient
      colors={['#5B21B6', '#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" hidden />
      <JuvShapes density={1.4} />

      {/* ── LIVE VIDEO (YouTube) ───────────────────────────────── */}
      {streamUrl ? (
        <YouTubePlayer
          streamUrl={streamUrl}
          style={styles.videoBox}
        />
      ) : null}

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.playerBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.playerText}>
            {playerCount.toLocaleString()} conectados
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            offAll();
            disconnectSocket();
            setGameState('idle');
            navigation.goBack();
          }}
        >
          <Text style={styles.closeIcon}>‹</Text>
        </TouchableOpacity>
      </View>

      {/* ── COUNTDOWN BLOCK (animated top) ──────────────────────── */}
      <Animated.View style={[styles.countdownBlock, countdownStyle]}>
        <Text style={styles.prizeLabel}>S/{displayPrize.toLocaleString()} · EMPIEZA EN</Text>
        {winnersLabel && (
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: -4, marginBottom: 4 }}>
            {winnersLabel}
          </Text>
        )}
        <View style={styles.cdRow}>
          {hours > 0 && (
            <>
              <View style={styles.cdGroup}>
                <Text style={styles.cdNum}>{pad(hours)}</Text>
                <Text style={styles.cdUnit}>HRS</Text>
              </View>
              <Text style={styles.cdColon}>:</Text>
            </>
          )}
          <View style={styles.cdGroup}>
            <Text style={styles.cdNum}>{pad(mins)}</Text>
            <Text style={styles.cdUnit}>MIN</Text>
          </View>
          <Text style={styles.cdColon}>:</Text>
          <View style={styles.cdGroup}>
            <Text style={styles.cdNum}>{pad(secs)}</Text>
            <Text style={styles.cdUnit}>SEG</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── MIDDLE CONTENT (appears when chat unlocks) ───────────── */}
      <Animated.View style={[styles.midContent, midStyle]}>
        <JuvQLogo size={90} animated />
        <LinearGradient
          colors={['#EC4899', '#A855F7']}
          style={styles.closingBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.closingText}>Cierre de inscripciones</Text>
        </LinearGradient>
      </Animated.View>

      {/* ── JOIN SECTION ────────────────────────────────────────── */}
      <View style={[styles.joinSection, { bottom: 90 + (Platform.OS === 'android' ? insets.bottom : 0) }]}>
        {isJoined && game?.status === 'LIVE' ? (
          // Suscrito + juego en vivo → entrar
          <TouchableOpacity
            style={styles.participarBtn}
            activeOpacity={0.85}
            onPress={() => navigation.replace('Live', { gameId: game.id, streamUrl: game.streamUrl || null })}
          >
            <View style={styles.participarLeft}>
              <Text style={styles.participarText}>🔴 Entrar al juego</Text>
            </View>
            <View style={styles.participarBadge}>
              <Text style={styles.participarBadgeText}>EN VIVO</Text>
            </View>
          </TouchableOpacity>
        ) : isJoined ? (
          // Ya suscrito, esperando
          <View style={[styles.participarBtn, styles.participarJoined]}>
            <View style={styles.participarLeft}>
              <Text style={[styles.participarText, { color: '#34D399' }]}>✓ Ya estás inscrito</Text>
            </View>
            <View style={[styles.participarBadge, { backgroundColor: 'rgba(52,211,153,0.2)' }]}>
              <Text style={[styles.participarBadgeText, { color: '#34D399' }]}>
                INSCRITO
              </Text>
            </View>
          </View>
        ) : game && game.status !== 'LIVE' ? (
          // No suscrito + registro abierto → mostrar participar
          (game.entryFee ?? 0) > 0 ? (
            <TouchableOpacity
              style={styles.participarBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EventCode', { gameId: game.id, game })}
            >
              <View style={styles.participarLeft}>
                <Text style={styles.participarText}>Ver Detalles</Text>
              </View>
              <View style={styles.participarBadge}>
                <Text style={styles.participarBadgeText}>ACCESO RESTRINGIDO</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.participarBtn}
              activeOpacity={0.85}
              onPress={() => setShowJoinModal(true)}
            >
              <View style={styles.participarLeft}>
                <Text style={styles.participarText}>Participar</Text>
              </View>
              <View style={styles.participarBadge}>
                <Text style={styles.participarBadgeText}>GRATIS</Text>
              </View>
            </TouchableOpacity>
          )
        ) : null /* LIVE + no suscrito = solo espectador, sin botón */}
      </View>

      {/* ── CHAT (slides up when unlocked) ──────────────────────── */}
      <Animated.View style={[styles.chatSection, { bottom: 22 + (Platform.OS === 'android' ? insets.bottom : 0) }, chatStyle]} pointerEvents={chatUnlocked ? 'auto' : 'none'}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatMessages}>
            {displayChats.slice(-5).map((item, i) => (
              <Text key={item.id || i} style={styles.chatMsg}>
                <Text style={styles.chatUser}>{item.user}</Text>
                <Text style={styles.chatTxt}> {item.text}</Text>
              </Text>
            ))}
          </View>

          {showChatInput ? (
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Manda un saludo, causa…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity onPress={handleSendChat} style={styles.sendBtn}>
                <Text style={styles.sendIcon}>→</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.chatFab}
              onPress={() => setShowChatInput(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                style={styles.chatFabGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Svg viewBox="0 0 24 24" width={22} height={22} fill="none">
                  <Path
                    d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                    stroke="white"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </Animated.View>

      {/* ── LOCKED PILL (fades out when chat unlocks) ───────────── */}
      <Animated.View style={[styles.lockedWrap, { bottom: 22 + (Platform.OS === 'android' ? insets.bottom : 0) }, lockedStyle]} pointerEvents="none">
        <View style={styles.lockedPill}>
          <Svg viewBox="0 0 24 24" width={13} height={13} fill="none">
            <Rect x="3" y="11" width="18" height="11" rx="2"
              stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
            <Path d="M7 11V7a5 5 0 0110 0v4"
              stroke="rgba(255,255,255,0.45)" strokeWidth="2"
              strokeLinecap="round" />
          </Svg>
          <Text style={styles.lockedText}>Chat disponible cuando empiece el lobby</Text>
        </View>
      </Animated.View>

      {/* Join modal */}
      <JoinGameModal
        visible={showJoinModal}
        game={game}
        onClose={() => setShowJoinModal(false)}
        onJoined={async () => {
          setIsJoined(true);
          setShowJoinModal(false);
          await loadUser();
        }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  videoBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },

  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
    paddingHorizontal: 12,
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
    shadowRadius: 6,
  },
  playerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },

  // Countdown block — absolutely positioned, top animates
  countdownBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  prizeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FACC15',
    letterSpacing: 3,
    marginBottom: 8,
    opacity: 0.9,
  },
  cdRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  cdGroup: {
    alignItems: 'center',
    minWidth: 78,
  },
  cdNum: {
    fontSize: 86,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -4,
    lineHeight: 86,
    textShadowColor: 'rgba(250,204,21,0.35)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 28,
  },
  cdUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginTop: 6,
  },
  cdColon: {
    fontSize: 70,
    fontWeight: '900',
    color: 'rgba(250,204,21,0.4)',
    lineHeight: 86,
    marginBottom: 16,
    paddingHorizontal: 2,
  },

  // Middle content — centered, appears when chat unlocks
  midContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // sits between countdown top area and chat bottom
    top: '52%',
    zIndex: 4,
  },
  joinSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 6,
  },
  participarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '88%',
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FACC15',
    paddingHorizontal: 20,
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
  closingBadge: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  closingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },

  // Chat section — slides in from bottom
  chatSection: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  chatMessages: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  chatMsg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 5,
    lineHeight: 18,
  },
  chatUser: {
    color: '#FACC15',
    fontWeight: '800',
  },
  chatTxt: {
    color: 'rgba(255,255,255,0.7)',
  },
  chatInputRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  chatFab: {
    position: 'absolute',
    right: 18,
    bottom: 0,
  },
  chatFabGrad: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },

  // Locked pill
  lockedWrap: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lockedText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '700',
  },
});
