import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R } from '../theme';

interface DateTimePickerProps {
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function DateTimePicker({ mode, value, onChange, label, placeholder }: DateTimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const generateTimes = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour = h.toString().padStart(2, '0');
        const minute = m.toString().padStart(2, '0');
        times.push(`${hour}:${minute}`);
      }
    }
    return times;
  };

  const options = mode === 'date' ? generateDates() : generateTimes();

  const formatDisplay = (val: string) => {
    if (!val) return placeholder || (mode === 'date' ? 'Select date' : 'Select time');
    if (mode === 'date') {
      const date = new Date(val);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return val;
  };

  const handleConfirm = () => {
    onChange(tempValue);
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShowPicker(true)}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !value && styles.placeholder]}>
            {formatDisplay(value)}
          </Text>
        </View>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={C.muted} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === 'date' ? 'Select Date' : 'Select Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {options.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.option, tempValue === option && styles.optionSelected]}
                  onPress={() => setTempValue(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: tempValue === option }}
                >
                  <Text style={[styles.optionText, tempValue === option && styles.optionTextSelected]}>
                    {mode === 'date' 
                      ? new Date(option).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                      : option
                    }
                  </Text>
                  {tempValue === option && (
                    <Ionicons name="checkmark-circle" size={20} color={C.cyan} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleConfirm}
              >
                <Text style={styles.modalBtnTextPrimary}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
  },
  label: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  placeholder: {
    color: C.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.95)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: S.xl,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  optionSelected: {
    backgroundColor: C.cyanDim,
  },
  optionText: {
    fontSize: 15,
    color: C.text,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: C.cyan,
  },
  modalActions: {
    flexDirection: 'row',
    gap: S.md,
    padding: S.xl,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalBtnPrimary: {
    backgroundColor: C.cyan,
  },
  modalBtnTextSecondary: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  modalBtnTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
