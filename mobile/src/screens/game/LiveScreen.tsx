import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  StyleSheet as RN,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import { JuvShapes } from '../../components/JuvShapes';
import { SparkleMotif } from '../../components/JuvMotifs';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { Colors } from '../../theme/colors';
import { useStore } from '../../store/useStore';
import { gamesApi } from '../../services/api';
import { JoinGameModal } from '../../components/JoinGameModal';
import {
  connectSocket,
  joinLobby,
  sendChat,
  submitAnswer,
  onQuestion,
  onReveal,
  onGameFinish,
  onWaitingNext,
  onLobbyState,
  onLobbyUpdate,
  onChat,
  onRegistrationClosed,
  offAll,
  newMsgId,
} from '../../services/socket';

interface Props {
  navigation: any;
  route: any;
}

type Phase = 'waiting' | 'answering' | 'reveal' | 'finished';

const TIMER_MAX = 10;
const EASE = Easing.out(Easing.cubic);

export const LiveScreen: React.FC<Props> = ({ navigation, route }) => {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const { user, chatMessages, addChatMessage, setGameState } = useStore();
  const gameId: string = route?.params?.gameId || 'default';
  const streamUrl: string | null = route?.params?.streamUrl || null;

  const [phase, setPhase] = useState<Phase>('waiting');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<{ text: string; answers: string[]; correct: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_MAX);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealCorrect, setRevealCorrect] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);
  const [isEliminated, setIsEliminated] = useState(false);
  const [showEliminatedModal, setShowEliminatedModal] = useState(false);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [gameData, setGameData] = useState<any>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [gameWinners, setGameWinners] = useState<Array<{ username: string; prize: number }>>([]);
  const [totalPrize, setTotalPrize] = useState(0);
  const [isWarmup, setIsWarmup] = useState(false);

  // Fetch game data on mount so we know entryFee for join routing (works for FREE, VIP and SPECIAL)
  useEffect(() => {
    gamesApi.get(gameId).then((res) => {
      setGameData(res.data.data ?? res.data);
    }).catch(() => {});
  }, [gameId]); // eslint-disable-line

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  // ── Reanimated shared values ─────────────────────────────────────
  // avatarProgress: 0 = video full screen | 1 = video is small avatar
  const avatarProgress = useSharedValue(0);
  // cardVisible: 0 = question card hidden | 1 = visible
  const cardVisible = useSharedValue(0);

  // ── Animate on phase change ──────────────────────────────────────
  useEffect(() => {
    if (phase === 'answering') {
      avatarProgress.value = withTiming(1, { duration: 450, easing: EASE });
      cardVisible.value    = withTiming(1, { duration: 380, easing: EASE });
    } else if (phase === 'reveal') {
      avatarProgress.value = withTiming(0, { duration: 450, easing: EASE });
    } else if (phase === 'finished') {
      // Video shrinks to round avatar top-left; question card hides
      avatarProgress.value = withTiming(1, { duration: 600, easing: EASE });
      cardVisible.value    = withTiming(0, { duration: 300, easing: EASE });
    } else {
      // 'waiting': full screen video, card hidden
      avatarProgress.value = withTiming(0, { duration: 450, easing: EASE });
      cardVisible.value    = withTiming(0, { duration: 300, easing: EASE });
    }
  }, [phase]); // eslint-disable-line

  // ── Animated styles ──────────────────────────────────────────────
  const videoAnimStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top:          interpolate(avatarProgress.value, [0, 1], [0, 108]),
    left:         interpolate(avatarProgress.value, [0, 1], [0, 16]),
    width:        interpolate(avatarProgress.value, [0, 1], [SCREEN_W, 80]),
    height:       interpolate(avatarProgress.value, [0, 1], [SCREEN_H, 80]),
    borderRadius: interpolate(avatarProgress.value, [0, 1], [0, 40]),
    overflow:     'hidden',
    zIndex: 2,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardVisible.value,
    transform: [{ translateY: interpolate(cardVisible.value, [0, 1], [28, 0]) }],
  }));


  // Chat fades to 55% opacity when the question card is visible
  const chatContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardVisible.value, [0, 1], [1, 0.55]),
  }));

  // Fallback avatar (no stream): fades in + scales up only when a question is active
  const avatarFallbackStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 108,
    left: 16,
    zIndex: 2,
    opacity: avatarProgress.value,
    transform: [{ scale: interpolate(avatarProgress.value, [0, 1], [0.6, 1]) }],
  }));

  // ── Socket ───────────────────────────────────────────────────────
  useEffect(() => {
    const s = connectSocket();

    // Re-join room on every connect/reconnect (server restart drops rooms)
    const handleConnect = () => {
      if (user?.id) joinLobby(gameId, user.id);
    };
    s.on('connect', handleConnect);
    if (s.connected && user?.id) joinLobby(gameId, user.id);

    onLobbyState((data: any) => {
      if (data.playerCount !== undefined) setPlayerCount(data.playerCount);
      if (data.isRegistered !== undefined) setIsRegistered(data.isRegistered);
      if (data.isRegistrationClosed) {
        setRegistrationClosed(true);
        // Only mark eliminated once registration is closed and user never joined
        if (!data.isRegistered) setIsEliminated(true);
      }
    });

    onRegistrationClosed(() => {
      setRegistrationClosed(true);
      // Non-registered users become permanent spectators when registration closes
      gamesApi.getMyEntry(gameId).then((res) => {
        const joined = res.data.data.joined;
        setIsRegistered(joined);
        if (!joined) {
          setIsEliminated(true);
          setShowEliminatedModal(true);
          setTimeout(() => setShowEliminatedModal(false), 2000);
        }
      }).catch(() => {
        setIsEliminated(true);
      });
    });

    onQuestion((data: any) => {
      // Cancel any pending reveal→waiting transition so the new card isn't hidden
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      setShowEliminatedModal(false); // hide modal when next question arrives
      setIsWarmup(!!data.isWarmup);
      setCurrentQuestion({
        text: data.question || data.text || '',
        answers: data.answers || data.options || [],
        correct: data.correctIndex ?? 0,
      });
      setQuestionIdx(data.questionIndex ?? data.qIdx ?? 0);
      setTotalQuestions(data.totalQuestions ?? 0);
      setPhase('answering');
      setTimeLeft(data.timeLimit ?? TIMER_MAX);
      setSelectedAnswer(null);
      setRevealCorrect(null);
    });

    onLobbyUpdate((data: any) => {
      if (data.playerCount !== undefined) setPlayerCount(data.playerCount);
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

    onReveal((data: any) => {
      setRevealCorrect(data.correctIndex ?? 0);
      setPhase('reveal');
      if (data.isWarmup) {
        // Warmup: just show feedback, no eliminations
        revealTimerRef.current = setTimeout(() => {
          revealTimerRef.current = null;
          setPhase('waiting');
        }, 3000);
        return;
      }
      const eliminated: string[] = data.eliminated ?? [];
      const wasEliminated = !!user?.id && eliminated.includes(user.id);
      // Return to full-screen presenter after 2 seconds (cancelled if next question arrives first)
      revealTimerRef.current = setTimeout(() => {
        revealTimerRef.current = null;
        setPhase('waiting');
        if (wasEliminated) {
          setIsEliminated(true);
          setShowEliminatedModal(true);
          setTimeout(() => setShowEliminatedModal(false), 2000);
        }
      }, 2000);
    });

    onWaitingNext(() => {
      setPhase('waiting');
    });

    onGameFinish((data: any) => {
      setGameWinners(data.winners ?? []);
      setTotalPrize(data.prize ?? 0);
      setShowEliminatedModal(false);
      setPhase('finished');
      setTimeout(() => {
        setGameState('finished');
        navigation.replace('Dashboard');
      }, 20000);
    });

    return () => {
      s.off('connect', handleConnect);
      offAll();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [gameId, user?.id]); // eslint-disable-line

  // ── Timer countdown (solo cuando hay pregunta activa del socket) ─
  useEffect(() => {
    if (phase !== 'answering') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const answerLocked = phase !== 'answering' || timeLeft <= 2 || isEliminated;

  const handleAnswer = (idx: number) => {
    if (answerLocked || idx === selectedAnswer) return;
    setSelectedAnswer(idx);
    if (user?.id) submitAnswer(gameId, user.id, questionIdx, idx);
  };

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
    setShowChatInput(false);
  };

const getAnswerBg = (idx: number): string => {
    const correct = revealCorrect ?? currentQuestion?.correct ?? -1;
    if (phase === 'answering') return idx === selectedAnswer ? '#A855F7' : '#F4F4F5';
    if (idx === correct) return '#34D399';
    if (idx === selectedAnswer) return '#F87171';
    return '#F4F4F5';
  };

  const getAnswerTextColor = (idx: number): string => {
    const correct = revealCorrect ?? currentQuestion?.correct ?? -1;
    if (phase === 'answering') return idx === selectedAnswer ? 'white' : '#1F0A2E';
    if (idx === correct) return 'white';
    if (idx === selectedAnswer) return 'white';
    return '#1F0A2E';
  };

  const isTimerCritical = timeLeft <= 3;
  const isAnswerLockWarning = timeLeft === 2; // flash indicator right when locking

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientMid, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" hidden />
      <JuvShapes density={0.8} seed={1} />

      {/* ── VIDEO / AVATAR ─────────────────────────────────────── */}
      {streamUrl ? (
        <Animated.View style={videoAnimStyle}>
          <YouTubePlayer streamUrl={streamUrl} style={RN.absoluteFill} />
        </Animated.View>
      ) : (
        // Fallback avatar (no stream) — hidden until question is sent
        <Animated.View style={avatarFallbackStyle}>
          <LinearGradient
            colors={['#FACC15', '#EC4899', '#A855F7']}
            style={styles.hostRing}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={['#C4B5FD', '#818CF8']}
              style={styles.hostAvatar}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Svg viewBox="0 0 28 28" width={36} height={36}>
                <Circle cx="14" cy="14" r="9" fill="white" />
                <Circle cx="11" cy="13" r="1.4" fill="#1F0A2E" />
                <Circle cx="17" cy="13" r="1.4" fill="#1F0A2E" />
                <Path
                  d="M10.5 16.5 q 3.5 3 7 0"
                  fill="none"
                  stroke="#1F0A2E"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </Svg>
            </LinearGradient>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ── TOP BAR (always on top) ────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.liveBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
        <View style={styles.playerBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.playerText}>
            {playerCount.toLocaleString()} conectados
          </Text>
          {isEliminated && (
            <View style={styles.spectatorBadge}>
              <Text style={styles.spectatorText}>Espectador</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => { offAll(); setGameState('idle'); navigation.navigate('Dashboard'); }}
          style={styles.exitBtn}
        >
          <Text style={styles.exitText}>‹</Text>
        </TouchableOpacity>
      </View>

      {/* ── TIMER (mounted/unmounted with phase, own fade animation) */}
      {phase === 'answering' && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.timer, isTimerCritical && styles.timerCritical]}
        >
          <Text style={styles.timerText}>{timeLeft}</Text>
        </Animated.View>
      )}

      {/* ── QUESTION CARD (animated in/out) ───────────────────── */}
      {currentQuestion && (
        <Animated.View style={[styles.questionCard, cardAnimStyle]}>
          <View style={styles.questionNumRow}>
            <SparkleMotif size={12} color={isWarmup ? '#059669' : '#9333EA'} />
            <Text style={[styles.questionNum, isWarmup && { color: '#059669' }]}>
              {isWarmup ? '🧪 PREGUNTA DE PRUEBA' : `PREGUNTA ${questionIdx + 1}${totalQuestions > 0 ? `/${totalQuestions}` : ''}`}
            </Text>
            {isEliminated && (
              <View style={styles.eliminatedBadge}>
                <Text style={styles.eliminatedBadgeText}>ELIMINADO</Text>
              </View>
            )}
          </View>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          <View style={styles.answersContainer}>
            {currentQuestion.answers.map((answer, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.answerBtn,
                  { backgroundColor: getAnswerBg(idx) },
                  answerLocked && idx === selectedAnswer && styles.answerBtnLocked,
                ]}
                onPress={() => handleAnswer(idx)}
                activeOpacity={answerLocked ? 1 : 0.8}
                disabled={answerLocked}
              >
                <Text style={[styles.answerText, { color: getAnswerTextColor(idx) }]}>
                  {answer}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}


      {/* ── ELIMINATED MODAL ─────────────────────────────────── */}
      {showEliminatedModal && (
        <View style={styles.eliminatedOverlay}>
          <View style={styles.eliminatedModal}>
            <Text style={styles.eliminatedEmoji}>💀</Text>
            <Text style={styles.eliminatedTitle}>FUISTE ELIMINADO</Text>
            <Text style={styles.eliminatedHint}>Puedes seguir viendo como espectador</Text>
          </View>
        </View>
      )}

      {/* ── WINNERS PANEL (video shrinks to avatar, list fills remaining space) ── */}
      {phase === 'finished' && (
        <Animated.View entering={FadeIn.duration(400).delay(500)} style={styles.winnersPanel}>
          <Text style={styles.winnersTrophy}>🏆</Text>
          <Text style={styles.winnersTitle}>¡Juego terminado!</Text>
          {totalPrize > 0 && (
            <Text style={styles.winnersPot}>Premio total: S/{totalPrize.toFixed(2)}</Text>
          )}
          {gameWinners.length === 0 ? (
            <Text style={styles.winnersEmpty}>Nadie completó el juego esta vez.</Text>
          ) : (
            <ScrollView
              style={styles.winnersScroll}
              contentContainerStyle={styles.winnersScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {gameWinners.map((w, i) => (
                <View key={w.username} style={[styles.winnerRow, i === 0 && styles.winnerRowFirst]}>
                  <Text style={styles.winnerRankText}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </Text>
                  <Text style={[styles.winnerName, i === 0 && styles.winnerNameFirst]}>
                    {w.username}
                  </Text>
                  <Text style={[styles.winnerPrize, i === 0 && styles.winnerPrizeFirst]}>
                    S/{w.prize.toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.winnersDoneBtn}
            onPress={() => { setGameState('finished'); navigation.replace('Dashboard'); }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              style={styles.winnersDoneBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.winnersDoneBtnText}>Volver al inicio</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}



      {/* ── PARTICIPAR — solo si registro abierto y no suscrito ── */}
      {!isRegistered && !registrationClosed && phase !== 'finished' && (
        <View style={styles.joinBanner}>
          {(gameData?.entryFee ?? 0) > 0 ? (
            <TouchableOpacity
              style={styles.joinBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EventCode', { gameId, game: gameData })}
            >
              <Text style={styles.joinBtnText}>Ver Detalles del Evento</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.joinBtn}
              activeOpacity={0.85}
              onPress={() => setShowJoinModal(true)}
            >
              <Text style={styles.joinBtnText}>Participar — GRATIS</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── CHAT ─────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatWrap}
        pointerEvents="box-none"
      >
        {/* Scrollable chat — up to 100 messages, auto-scrolls to newest */}
        <Animated.View style={[styles.chatMessages, chatContainerStyle]}>
          <ScrollView
            ref={chatScrollRef}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: phase === 'waiting' ? 220 : 130 }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
          >
            {chatMessages.slice(-100).map((msg, i, arr) => {
              const ageFactor = arr.length <= 1 ? 1 : i / (arr.length - 1);
              const opacity = 0.2 + ageFactor * 0.8; // oldest=0.2 → newest=1.0
              return (
                <Text key={msg.id} style={[styles.chatMsg, { opacity }]}>
                  <Text style={styles.chatUser}>{msg.user}: </Text>
                  <Text style={styles.chatText}>{msg.text}</Text>
                </Text>
              );
            })}
          </ScrollView>
        </Animated.View>

        {showChatInput ? (
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe un mensaje…"
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
              <Svg viewBox="0 0 24 24" width={20} height={20} fill="none">
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
      <JoinGameModal
        visible={showJoinModal}
        game={gameData}
        onClose={() => setShowJoinModal(false)}
        onJoined={async () => {
          setIsRegistered(true);
          setShowJoinModal(false);
        }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'white',
  },
  liveText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: '800',
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },

  // Timer — only visible during answering (animated)
  timer: {
    position: 'absolute',
    top: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  timerCritical: {
    backgroundColor: '#EF4444',
  },
  timerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },

  hostRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
  },

  // Question card — animated
  questionCard: {
    position: 'absolute',
    top: 210,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 48,
    elevation: 12,
    zIndex: 3,
  },
  questionNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  questionNum: {
    color: '#9333EA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  questionText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1F0A2E',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  answersContainer: { gap: 10 },
  answerBtn: {
    height: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  answerBtnLocked: {
    borderWidth: 2,
    borderColor: '#A855F7',
  },
  answerText: {
    fontSize: 16,
    fontWeight: '800',
  },

  chatWrap: {
    position: 'absolute',
    bottom: 72,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  chatMessages: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxWidth: '75%',
  },
  chatMsg: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 6,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chatUser: {
    color: '#FACC15',
    fontWeight: '800',
  },
  chatText: {
    color: 'rgba(255,255,255,0.85)',
  },
  chatInputRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    right: 16,
    bottom: 0,
  },
  chatFabGrad: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
  },

  // Winners panel — appears alongside the shrunken host avatar
  winnersPanel: {
    position: 'absolute',
    top: 210,
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 10,
    alignItems: 'center',
  },
  winnersTrophy: {
    fontSize: 52,
    marginBottom: 6,
  },
  winnersTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  winnersPot: {
    color: '#FACC15',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  winnersEmpty: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  winnersScroll: {
    width: '100%',
    flex: 1,
    marginBottom: 16,
  },
  winnersScrollContent: {
    gap: 8,
    paddingBottom: 8,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  winnerRowFirst: {
    backgroundColor: 'rgba(250,204,21,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.45)',
  },
  winnerRankText: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  winnerName: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '700',
  },
  winnerNameFirst: {
    color: '#FACC15',
    fontSize: 17,
  },
  winnerPrize: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '900',
  },
  winnerPrizeFirst: {
    fontSize: 18,
  },
  winnersDoneBtn: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  winnersDoneBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
  },
  winnersDoneBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Join banner (registration open, user not registered)
  joinBanner: {
    position: 'absolute',
    bottom: 130,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  joinBtn: {
    backgroundColor: '#FACC15',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  joinBtnText: {
    color: '#1F0A2E',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  spectatorBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  spectatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  // Eliminated badge (on question card)
  eliminatedBadge: {
    marginLeft: 'auto',
    backgroundColor: '#EF4444',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eliminatedBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Eliminated modal overlay
  eliminatedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  eliminatedModal: {
    backgroundColor: 'rgba(20,5,35,0.96)',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  eliminatedEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  eliminatedTitle: {
    color: '#EF4444',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  eliminatedSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  lifeBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
    width: '100%',
  },
  lifeBtnGrad: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderRadius: 999,
  },
  lifeBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  eliminatedHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
