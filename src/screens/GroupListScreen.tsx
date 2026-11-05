import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GroupCard } from '../components/RideCards';
import { Button, Chip, EmptyState, Header, Loading, Notice, Screen } from '../components/ui';
import { placeById } from '../config';
import { useMe } from '../data/auth';
import { useNow, useRouteGroups } from '../data/groups';
import { suggestedDeparture, windowSubtitle } from '../lib/time';
import { useJoin } from '../lib/useJoin';
import type { ScreenProps } from '../navigation/types';
import { type } from '../theme';

type Filter = 'all' | 'split' | 'free';

export default function GroupListScreen({ route, navigation }: ScreenProps<'GroupList'>) {
  const { fromId, toId, windowId } = route.params;
  const me = useMe();
  const now = useNow();
  const { data, loading, error } = useRouteGroups(fromId, toId, windowId);
  const { join, joiningId } = useJoin();
  const [filter, setFilter] = useState<Filter>('all');

  const groups = useMemo(() => data.filter((g) => g.departure.getTime() > now.getTime()), [data, now]);
  const shown = groups.filter((g) => (filter === 'split' ? g.fare > 0 : filter === 'free' ? g.fare === 0 : true));
  const title = `${placeById(fromId).short} → ${placeById(toId).short}`;

  const create = () =>
    navigation.navigate('CreateGroup', { fromId, toId, departure: suggestedDeparture(windowId).getTime() });

  return (
    <Screen
      header={<Header title={title} subtitle={windowSubtitle(windowId)} />}
      footer={<Button label="Start a new group" onPress={create} />}
      contentStyle={{ paddingTop: 4 }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={`All ${groups.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Splitting fare" selected={filter === 'split'} onPress={() => setFilter('split')} />
        <Chip label="Free rides" selected={filter === 'free'} onPress={() => setFilter('free')} />
      </ScrollView>

      {error ? (
        <View style={{ gap: 8 }}>
          <Notice tone="coral" icon="alert-triangle">
            {error.includes('index')
              ? 'Firestore needs an index for this search. Open the link below (also printed in the Expo terminal), click Create, wait a minute, then come back.'
              : error}
          </Notice>
          {error.match(/https:\/\/\S+/) ? (
            <Text selectable style={[type.small, { fontSize: 11 }]}>
              {error.match(/https:\/\/\S+/)?.[0]}
            </Text>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={{ height: 200 }}>
          <Loading />
        </View>
      ) : shown.length === 0 && !error ? (
        <EmptyState
          title="No groups yet"
          body={`Nobody has posted a ride on this route for ${windowSubtitle(windowId).toLowerCase()}. Start one and others can join you.`}
        />
      ) : (
        shown.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            isMine={g.memberIds.includes(me.uid)}
            joining={joiningId === g.id}
            onOpen={() => navigation.navigate('GroupDetail', { groupId: g.id })}
            onJoin={async () => {
              if (await join(g.id)) navigation.navigate('GroupDetail', { groupId: g.id });
            }}
          />
        ))
      )}
      {shown.length > 0 ? <Text style={[type.small, { textAlign: 'center' }]}>Groups are capped at 4 riders, one taxi.</Text> : null}
    </Screen>
  );
}
