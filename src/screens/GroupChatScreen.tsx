import React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatView } from '../components/ChatView';
import { Badge, EmptyState, Header, Loading } from '../components/ui';
import { useMe } from '../data/auth';
import { sendGroupMessage, useMessages } from '../data/chat';
import { myShare, routeLabel, useGroup } from '../data/groups';
import { formatNu } from '../lib/fare';
import { formatDayRelative, formatTime } from '../lib/time';
import { useOpenChat } from '../lib/useOpenChat';
import type { ScreenProps } from '../navigation/types';
import { colors } from '../theme';

export default function GroupChatScreen({ route, navigation }: ScreenProps<'GroupChat'>) {
  const { groupId } = route.params;
  const me = useMe();
  const { data: g, loading: gLoading } = useGroup(groupId);
  const isMember = !!g?.memberIds.includes(me.uid);
  const chat = useMessages(isMember ? ['groups', groupId, 'messages'] : null);
  useOpenChat(`group:${groupId}`);

  if (gLoading) return <Loading />;

  const header = (
    <Header
      title={g ? routeLabel(g) : 'Group chat'}
      subtitle={g ? `${formatDayRelative(g.departure)} · ${formatTime(g.departure)} · ${g.memberIds.length} rider${g.memberIds.length === 1 ? '' : 's'}` : undefined}
      right={
        g ? (
          <Pressable onPress={() => navigation.navigate('GroupDetail', { groupId })}>
            <Badge label={g.fare === 0 ? 'Free' : `${formatNu(myShare(g))} each`} tone="amber" />
          </Pressable>
        ) : null
      }
    />
  );

  if (!g || !isMember) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        {header}
        <View style={{ padding: 20 }}>
          <EmptyState title="Members only" body="Only riders in this group can read its chat. Join the group to take part." />
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
        loading={chat.loading}
        hasMore={chat.hasMore}
        loadOlder={chat.loadOlder}
        showNames
        placeholder="Message the group"
        onSend={(t) => sendGroupMessage(groupId, me, t)}
        onPressSender={(m) => {
          const member = g.members[m.senderId];
          if (!member || m.senderId === me.uid) return;
          navigation.navigate('DirectChat', {
            peer: { uid: m.senderId, name: member.name, initials: member.initials },
            context: `Rider in your ${formatTime(g.departure)} group`,
          });
        }}
      />
    </SafeAreaView>
  );
}
