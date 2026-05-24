import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, BorderRadius } from '../../theme';
import { getInitials, getAvatarColor } from '../../utils/helpers';

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: number;
  online?: boolean;
  showBadge?: boolean;
}

export function Avatar({ name, photoURL, size = 44, online, showBadge = false }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);
  const badgeSize = size * 0.28;

  return (
    <View style={{ width: size, height: size }}>
      {photoURL ? (
        <Image
          source={{ uri: photoURL }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.initials,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor + '33',
              borderColor: bgColor + '66',
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              { fontSize: size * 0.35, color: bgColor },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: online ? Colors.success : Colors.mutedForeground,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initialsText: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.card,
  },
});
