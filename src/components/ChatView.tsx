import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage } from '../data/types';
import { formatDayRelative, formatTime, startOfDay } from '../lib/time';
import { colors, fonts } from '../theme';

type Item =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; id: string; m: ChatMessage; showName: boolean };

export function ChatView({
  messages,
  meId,
  onSend,
  hasMore,
  loadOlder,
  loading,
  placeholder,
  banner,
  showNames,
  onPressSender,
  readOnly,
}: {
  messages: ChatMessage[];
  meId: string;
  onSend: (text: string) => Promise<void>;
  hasMore: boolean;
  loadOlder: () => Promise<void>;
  loading: boolean;
  placeholder: string;
  banner?: React.ReactNode;
  showNames: boolean;
  onPressSender?: (m: ChatMessage) => void;
  readOnly?: string;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Built oldest-first with day separators, then reversed for the inverted list.
  const items = useMemo(() => {
    const out: Item[] = [];
    let lastDay = -1;
    let lastSender = '';
    for (const m of messages) {
      const day = startOfDay(m.sentAt).getTime();
      if (day !== lastDay) {
        out.push({ kind: 'day', id: `day-${day}`, label: formatDayRelative(m.sentAt) });
        lastDay = day;
        lastSender = '';
      }
      const showName = showNames && !m.system && m.senderId !== meId && m.senderId !== lastSender;
      out.push({ kind: 'msg', id: m.id, m, showName });
      lastSender = m.system ? '' : m.senderId;
    }
    return out.reverse();
  }, [messages, meId, showNames]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    try {
      await onSend(t);
    } catch {
      setText(t);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'day') {
      return (
        <Text style={{ alignSelf: 'center', fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 1, color: colors.ink500, marginVertical: 12 }}>
          {item.label.toUpperCase()}
        </Text>
      );
    }
    const { m, showName } = item;
    if (m.system) {
      return (
        <View style={{ alignSelf: 'center', maxWidth: '85%', backgroundColor: colors.amber100, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 6, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber500 }} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: colors.amber600, flexShrink: 1 }}>{m.text}</Text>
        </View>
      );
    }
    const mine = m.senderId === meId;
    return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginTop: showName ? 10 : 4 }}>
        {showName ? (
          <Pressable onPress={onPressSender ? () => onPressSender(m) : undefined} hitSlop={6}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink500, marginBottom: 4, marginLeft: 4 }}>{m.senderName}</Text>
          </Pressable>
        ) : null}
        <View
          style={{
            maxWidth: '78%',
            backgroundColor: mine ? colors.amber500 : colors.surface,
            borderWidth: mine ? 0 : 1,
            borderColor: colors.lineSoft,
            borderRadius: 16,
            borderBottomRightRadius: mine ? 4 : 16,
            borderBottomLeftRadius: mine ? 16 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.ink900 }}>{m.text}</Text>
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 10.5, color: colors.ink500, marginTop: 3, marginHorizontal: 4 }}>{formatTime(m.sentAt)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.ink900} />
          </View>
        ) : (
          <FlatList
            inverted
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <View style={{ gap: 12, paddingBottom: 8 }}>
                {hasMore ? (
                  <Pressable
                    onPress={async () => {
                      setLoadingOlder(true);
                      await loadOlder().catch(() => {});
                      setLoadingOlder(false);
                    }}
                    style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.sunken }}
                  >
                    {loadingOlder ? (
                      <ActivityIndicator size="small" color={colors.ink700} />
                    ) : (
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink700 }}>Load earlier messages</Text>
                    )}
                  </Pressable>
                ) : null}
                {banner}
              </View>
            }
          />
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10) + 4,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.lineSoft,
        }}
      >
        {readOnly ? (
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: colors.ink500, paddingVertical: 12 }}>{readOnly}</Text>
        ) : (
          <>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.ink300}
              multiline
              maxLength={1000}
              style={{
                flex: 1,
                minHeight: 46,
                maxHeight: 120,
                borderRadius: 12,
                backgroundColor: colors.sunken,
                paddingHorizontal: 14,
                paddingTop: 13,
                paddingBottom: 13,
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.ink900,
              }}
            />
            <Pressable
              onPress={send}
              style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: text.trim() ? colors.amber500 : colors.amber100, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Send"
            >
              {sending ? <ActivityIndicator color={colors.ink900} /> : <Feather name="send" size={19} color={colors.ink900} />}
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
