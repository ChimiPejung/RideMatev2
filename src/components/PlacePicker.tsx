import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLACES } from '../config';
import { colors, fonts, type } from '../theme';

export function PlacePicker({
  visible,
  title,
  selectedId,
  disabledId,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  selectedId: string;
  disabledId?: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,40,48,0.45)' }]} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 4,
            gap: 6,
          }}
        >
          <Text style={[type.screenTitle, { marginBottom: 8 }]}>{title}</Text>
          {PLACES.map((p) => {
            const disabled = p.id === disabledId;
            const selected = p.id === selectedId;
            return (
              <Pressable
                key={p.id}
                disabled={disabled}
                onPress={() => {
                  onPick(p.id);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: selected ? colors.sunken : 'transparent',
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink900 }}>{p.name}</Text>
                {selected ? <Feather name="check" size={18} color={colors.mint600} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
