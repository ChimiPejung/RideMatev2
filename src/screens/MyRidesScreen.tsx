import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NextRideCard } from '../components/RideCards';
import { RideRow } from '../components/RideRow';
import { Badge, Button, Card, Divider, EmptyState, Loading, Screen } from '../components/ui';
import { useMe } from '../data/auth';
import { useRatedGroupIds } from '../data/ratings';
import { useSession } from '../data/session';
import { colors, fonts, type } from '../theme';

export function Segment({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.sunken, borderRadius: 12, padding: 4 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{ flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent' }}
          >
            <Text style={{ fontFamily: on ? fonts.semibold : fonts.medium, fontSize: 14, color: on ? colors.ink900 : colors.ink500 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MyRidesScreen() {
  const nav = useNavigation();
  const me = useMe();
  const { upcoming, past, groupsLoading } = useSession();
  const rated = useRatedGroupIds(me.uid);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  return (
    <Screen>
      <Text style={[type.title, { fontSize: 26, marginTop: 6 }]}>My rides</Text>
      <Segment
        value={tab}
        onChange={(v) => setTab(v as 'upcoming' | 'past')}
        options={[
          { id: 'upcoming', label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` },
          { id: 'past', label: 'Past rides' },
        ]}
      />

      {groupsLoading ? (
        <View style={{ height: 160 }}>
          <Loading />
        </View>
      ) : tab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <EmptyState title="No upcoming rides" body="Groups you create or join show up here, with a reminder before each one.">
            <Button label="Find a ride" onPress={() => nav.navigate('Tabs', { screen: 'Rides' } as never)} />
          </EmptyState>
        ) : (
          upcoming.map((g) => <NextRideCard key={g.id} group={g} onPress={() => nav.navigate('GroupDetail', { groupId: g.id })} />)
        )
      ) : past.length === 0 ? (
        <EmptyState title="No past rides yet" body="After a ride leaves, it moves here so you can rate the people you rode with." />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {past.map((g, i) => {
            const canRate = g.memberIds.length > 1 && !rated.has(g.id);
            return (
              <React.Fragment key={g.id}>
                {i > 0 ? <Divider /> : null}
                <RideRow
                  group={g}
                  onPress={() => nav.navigate('GroupDetail', { groupId: g.id })}
                  right={
                    canRate ? (
                      <Button label="Rate" small onPress={() => nav.navigate('RateRiders', { groupId: g.id })} />
                    ) : rated.has(g.id) ? (
                      <Badge label="Rated" tone="mint" />
                    ) : undefined
                  }
                />
              </React.Fragment>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
