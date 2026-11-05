import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Avatar, Card, Divider, EmptyState, Screen, SectionLabel } from '../components/ui';
import { useMe } from '../data/auth';
import { routeLabel, useNow } from '../data/groups';
import { useSession } from '../data/session';
import { firstName } from '../data/types';
import { formatDayRelative, formatTime } from '../lib/time';
import { colors, fonts, type } from '../theme';

function when(d: Date) {
  const rel = formatDayRelative(d);
  return rel === 'Today' ? formatTime(d) : rel;
}

function Row({ icon, title, preview, time, onPress }: { icon: React.ReactNode; title: string; preview: string; time?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900, flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
          {time ? <Text style={[type.small, { fontSize: 12 }]}>{time}</Text> : null}
        </View>
        <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const nav = useNavigation();
  const me = useMe();
  const { myGroups, dms, latestByGroup } = useSession();
  const now = useNow(60_000);
  const groupChats = myGroups
    .filter((g) => g.departure.getTime() > now.getTime() - 24 * 60 * 60 * 1000)
    .sort((a, b) => (latestByGroup[b.id]?.sentAt.getTime() ?? 0) - (latestByGroup[a.id]?.sentAt.getTime() ?? 0));
  const threads = dms.filter((t) => t.lastText);

  return (
    <Screen>
      <Text style={[type.title, { fontSize: 26, marginTop: 6 }]}>Chats</Text>

      <SectionLabel>Group chats</SectionLabel>
      {groupChats.length === 0 ? (
        <EmptyState title="No group chats" body="Each group you join gets a chat for pick-up points and running late." />
      ) : (
        <Card style={{ paddingVertical: 2 }}>
          {groupChats.map((g, i) => {
            const m = latestByGroup[g.id];
            const preview = m ? (m.system ? m.text : `${m.senderId === me.uid ? 'You' : firstName(m.senderName)}: ${m.text}`) : 'No messages yet';
            return (
              <React.Fragment key={g.id}>
                {i > 0 ? <Divider /> : null}
                <Row
                  icon={
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink900, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="users" size={17} color={colors.amber500} />
                    </View>
                  }
                  title={`${routeLabel(g)} · ${formatTime(g.departure)}`}
                  preview={preview}
                  time={m ? when(m.sentAt) : formatDayRelative(g.departure)}
                  onPress={() => nav.navigate('GroupChat', { groupId: g.id })}
                />
              </React.Fragment>
            );
          })}
        </Card>
      )}

      <SectionLabel>Direct messages</SectionLabel>
      {threads.length === 0 ? (
        <EmptyState title="No direct messages" body="Tap a rider in any of your groups to message them one to one." />
      ) : (
        <Card style={{ paddingVertical: 2 }}>
          {threads.map((t, i) => {
            const other = t.members.find((u) => u !== me.uid) ?? '';
            return (
              <React.Fragment key={t.id}>
                {i > 0 ? <Divider /> : null}
                <Row
                  icon={<Avatar initials={t.initials[other] ?? '?'} />}
                  title={t.names[other] ?? 'Rider'}
                  preview={`${t.lastSenderId === me.uid ? 'You: ' : ''}${t.lastText}`}
                  time={when(t.updatedAt)}
                  onPress={() => nav.navigate('DirectChat', { threadId: t.id })}
                />
              </React.Fragment>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
