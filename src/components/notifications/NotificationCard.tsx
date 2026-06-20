import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common';
import { BorderRadius, Colors } from '../../theme';
import type { NotificationPayload, NotificationType } from '../../services/notifications';

const ICONS: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  match_reminder: 'alarm-outline',
  join_request: 'person-add-outline',
  join_request_accepted: 'checkmark-circle-outline',
  join_request_rejected: 'close-circle-outline',
  chat_message: 'chatbubble-ellipses-outline',
  event_cancelled: 'calendar-clear-outline',
  system: 'sparkles-outline',
};

interface NotificationCardProps {
  notification: NotificationPayload;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  return (
    <GlassCard style={styles.card} neonBorder={notification.type === 'match_reminder'}>
      <View style={styles.iconWrap}>
        <Ionicons name={ICONS[notification.type]} size={20} color={Colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
        <Text style={styles.time}>
          {new Date(notification.createdAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 15,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.foreground,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.mutedForeground,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
});
