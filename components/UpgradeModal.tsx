/**
 * UpgradeModal Component
 * Modal shown to free users when they try to access premium features
 */
import React from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Text as ThemedText, useThemeColor } from './Themed';
import { Button } from './Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional custom message to display */
  message?: string;
}

export function UpgradeModal({
  visible,
  onClose,
  message = 'Navigation is available for Premium users only.',
}: UpgradeModalProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const dividerColor = useThemeColor({}, 'divider');
  const tintColor = Colors[colorScheme].tint;

  const handleUpgrade = () => {
    onClose();
    // Navigate to profile screen where users can upgrade
    // In the future, this could navigate to a dedicated subscription screen
    router.push('/(tabs)/profile');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: cardBackground }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <ThemedText style={[styles.modalTitle, { color: tintColor }]}>Premium Feature</ThemedText>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: dividerColor }]}>
              <ThemedText style={[styles.closeButtonText, { color: textSecondaryColor }]}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <ThemedText style={[styles.message, { color: textColor }]}>{message}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
              Upgrade to Premium to unlock navigation and other exclusive features.
            </ThemedText>
          </View>

          <View style={styles.modalActions}>
            <Button
              title="Maybe Later"
              onPress={onClose}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              title="Upgrade to Premium"
              onPress={handleUpgrade}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default UpgradeModal;
