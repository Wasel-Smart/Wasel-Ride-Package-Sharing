import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS, type StatusKey, R } from '../../theme';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const LABELS: Partial<Record<StatusKey, string>> = {
  pending:        'Pending',
  pending_driver: 'Awaiting driver',
  confirmed:      'Confirmed',
  accepted:       'Accepted',
  active:         'Active',
  in_progress:    'In progress',
  completed:      'Completed',
  captured:       'Paid',
  cancelled:      'Cancelled',
  rejected:       'Rejected',
  failed:         'Failed',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const key = status as StatusKey;
  const colors = STATUS_COLORS[key] ?? STATUS_COLORS['pending'];
  const label  = LABELS[key] ?? status;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg, borderColor: colors.dot + '40' },
      size === 'sm' && styles.sm,
    ]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text style={[styles.label, { color: colors.text }, size === 'sm' && styles.smText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  smText: {
    fontSize: 10,
  },
});
