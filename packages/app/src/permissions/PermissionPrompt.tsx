import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { permissionManager } from '@partneros/device';
import type { Permission } from '@partneros/device';
import { usePermissionStore } from './permissionStore';

const PERMISSION_LABELS: Record<Permission, string> = {
  CONTACTS: 'Contacts',
  CALL_PHONE: 'Phone calls',
  SEND_SMS: 'SMS',
  CAMERA: 'Camera',
  LOCATION: 'Location',
  ACCESSIBILITY_SERVICE: 'Accessibility (needed to auto-send messages)',
  CALENDAR: 'Calendar',
  MICROPHONE: 'Microphone',
};

/**
 * Renders whenever DeviceExecutor reports a command failed due to a missing
 * permission. Runtime permissions (Contacts, Camera, etc.) get requested
 * inline; ACCESSIBILITY_SERVICE can't be requested via dialog, so its
 * button deep-links to system Settings instead (user must manually toggle
 * it on, no way around that on Android).
 */
export function PermissionPrompt(): React.JSX.Element | null {
  const pending = usePermissionStore((s) => s.pending);
  const dismiss = usePermissionStore((s) => s.dismiss);

  const current = pending[0];
  if (!current) return null;

  const grant = async (permission: Permission) => {
    if (permission === 'ACCESSIBILITY_SERVICE') {
      permissionManager.openAccessibilitySettings();
      return;
    }
    await permissionManager.request(permission);
    // Re-check happens next time the command runs; we don't loop-poll here.
  };

  return (
    <Modal transparent animationType="fade" visible={!!current}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Permission needed</Text>
          <Text style={styles.subtitle}>
            To use "{current.app}", PartnerOS needs:
          </Text>
          {current.permissions.map((p) => (
            <TouchableOpacity key={p} style={styles.permRow} onPress={() => grant(p)}>
              <Text style={styles.permLabel}>{PERMISSION_LABELS[p] ?? p}</Text>
              <Text style={styles.grantText}>Grant</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.dismissButton} onPress={() => dismiss(current.app)}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', backgroundColor: '#16213e', borderRadius: 16, padding: 20 },
  title: { color: '#e94560', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#ccc', fontSize: 14, marginBottom: 16 },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  permLabel: { color: '#e0e0e0', fontSize: 14, flex: 1, marginRight: 12 },
  grantText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  dismissButton: { marginTop: 16, alignItems: 'center' },
  dismissText: { color: '#888', fontSize: 13 },
});
