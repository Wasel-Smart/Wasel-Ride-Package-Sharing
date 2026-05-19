import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export function EmptyState({
  icon, title, subtitle, actionLabel, onAction, iconColor = C.muted,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { borderColor: iconColor + '30' }]}>
        <Ionicons name={icon as any} size={40} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} size="sm" fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S['4xl'],
    paddingVertical: S['4xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: S.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginBottom: S.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: S.lg,
  },
  action: {
    marginTop: S.sm,
  },
});
