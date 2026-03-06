import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface CloudStateCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function CloudStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: CloudStateCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={Colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.white,
  },
});
