import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatView } from '../components/ChatView';
import { Avatar, EmptyState, Header, Notice } from '../components/ui';
import { useMe } from '../data/auth';
import { dmId, openDm, sendDm, useMessages } from '../data/chat';
import { useSession } from '../data/session';
import { useOpenChat } from '../lib/useOpenChat';
import type { ScreenProps } from '../navigation/types';
import { colors } from '../theme';

export default function DirectChatScreen({ route }: ScreenProps<'DirectChat'>) {
  const me = useMe();
  const { dms } = useSession();
  const { peer, context } = route.params;
  const threadId = route.params.threadId ?? (peer ? dmId(me.uid, peer.uid) : '');
  const thread = dms.find((t) => t.id === threadId);
  const otherId = peer?.uid ?? thread?.members.find((u) => u !== me.uid) ?? '';
  const name = peer?.name ?? thread?.names[otherId] ?? 'Rider';
  const initials = peer?.initials ?? thread?.initials[otherId] ?? '?';
  const subtitle = context ?? thread?.context ?? 'RideMate rider';

  // The thread document must exist before its messages can be read.
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !peer || !!thread || opened;
  useEffect(() => {
    if (!peer) return;
    openDm(me, peer, context)
      .then(() => setOpened(true))
      .catch((e) => setError(e?.message ?? 'Couldn’t open this chat.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer?.uid]);

  const chat = useMessages(ready && threadId ? ['dms', threadId, 'messages'] : null);
  useOpenChat(threadId ? `dm:${threadId}` : null);

  const header = <Header title={name} subtitle={subtitle} left={<Avatar initials={initials} size={36} />} />;

  if (!threadId || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        {header}
        <View style={{ padding: 20 }}>
          <EmptyState title="Chat unavailable" body={error ?? 'This conversation could not be found.'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.canvas }}>
      {header}
      <ChatView
        messages={chat.messages}
        meId={me.uid}
        loading={!ready || chat.loading}
        hasMore={chat.hasMore}
        loadOlder={chat.loadOlder}
        showNames={false}
        placeholder={`Message ${name.split(' ')[0]}`}
        onSend={(t) => sendDm(threadId, me, t)}
        banner={
          <Notice>You can message anyone in your group directly. No request, no waiting for approval.</Notice>
        }
      />
    </SafeAreaView>
  );
}
