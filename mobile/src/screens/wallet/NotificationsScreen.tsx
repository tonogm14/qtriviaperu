import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../theme/colors';
import { Notification } from '../../store/useStore';
import { notificationsApi } from '../../services/api';

interface Props {
  navigation: any;
}

const TYPE_CONFIG: Record<Notification['type'], { icon: string; color: string }> = {
  win: { icon: '🏆', color: Colors.yellow },
  reminder: { icon: '⏰', color: Colors.purple },
  life: { icon: '❤️', color: Colors.pink },
  rank: { icon: '📈', color: Colors.green },
  bonus: { icon: '🎁', color: Colors.pinkLight },
};

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = () => {
    setLoading(true);
    setError('');
    notificationsApi
      .list()
      .then((res) => {
        setNotifications(res.data.data || []);
      })
      .catch(() => {
        setError('No se pudieron cargar las notificaciones.');
      })
      .finally(() => setLoading(false));
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Optimistic update already done, silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientMid, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifs</Text>
        </View>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
          style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.4 }]}
        >
          <Text style={styles.markAllText}>Marcar todo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.yellow} />
          <Text style={styles.loadingText}>Cargando notificaciones...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchNotifications} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {unreadCount > 0 && (
            <Text style={styles.sectionLabel}>SIN LEER</Text>
          )}

          {notifications
            .filter((n) => !n.read)
            .map((notif) => (
              <NotifCard
                key={notif.id}
                notif={notif}
                onPress={() => handleMarkRead(notif.id)}
              />
            ))}

          {notifications.some((n) => n.read) && (
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ANTERIORES</Text>
          )}

          {notifications
            .filter((n) => n.read)
            .map((notif) => (
              <NotifCard
                key={notif.id}
                notif={notif}
                onPress={() => {}}
              />
            ))}

          {notifications.length === 0 && (
            <Text style={styles.emptyText}>No tienes notificaciones.</Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
};

const NotifCard: React.FC<{ notif: Notification; onPress: () => void }> = ({
  notif,
  onPress,
}) => {
  const config = TYPE_CONFIG[notif.type] || { icon: '📢', color: Colors.white };

  return (
    <TouchableOpacity
      style={[styles.card, !notif.read && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: config.color + '22' }]}>
        <Text style={styles.notifIcon}>{config.icon}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.notifTitle}>{notif.title}</Text>
        <Text style={styles.notifBody}>{notif.body}</Text>
        <Text style={styles.notifTime}>{notif.time}</Text>
      </View>
      {!notif.read && (
        <View style={[styles.unreadDot, { backgroundColor: config.color }]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '900',
  },
  unreadBadge: {
    backgroundColor: Colors.red,
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  markAllText: {
    color: Colors.yellow,
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    color: Colors.red,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: Colors.textOnYellow,
    fontSize: 15,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardUnread: {
    backgroundColor: 'rgba(250,204,21,0.10)',
    borderColor: 'rgba(250,204,21,0.3)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifIcon: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
  },
  notifTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  notifBody: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '500',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FACC15',
    marginTop: 6,
    flexShrink: 0,
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  },
});
