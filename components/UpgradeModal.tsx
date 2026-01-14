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
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Premium Feature</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subtitle}>
              Upgrade to Premium to unlock navigation and other exclusive features.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.upgradeButton]}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
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
    backgroundColor: '#fff',
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
    color: '#2f95dc',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#2f95dc',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UpgradeModal;
