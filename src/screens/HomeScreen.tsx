import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NextRideCard } from '../components/RideCards';
import { PlacePicker } from '../components/PlacePicker';
import { Avatar, Button, Chip, Divider, Screen, SectionLabel } from '../components/ui';
import { placeById } from '../config';
import { useMe } from '../data/auth';
import { useLeavingSoonCount } from '../data/groups';
import { useSession } from '../data/session';
import { firstName } from '../data/types';
import { suggestedDeparture, WINDOWS, type WindowId } from '../lib/time';
import { colors, fonts, type } from '../theme';

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const nav = useNavigation();
  const me = useMe();
  const { upcoming } = useSession();
  const leavingSoon = useLeavingSoonCount();
  const [fromId, setFromId] = useState('town');
  const [toId, setToId] = useState('campus');
  const [windowId, setWindowId] = useState<WindowId>('today');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const next = upcoming[0];

  const pick = (which: 'from' | 'to', id: string) => {
    if (which === 'from') {
      if (id === toId) setToId(fromId);
      setFromId(id);
    } else {
      if (id === fromId) setFromId(toId);
      setToId(id);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 21, color: colors.ink900 }}>
            {greeting()}, {firstName(me.name)}
          </Text>
          <Text style={[type.small, { marginTop: 3, fontSize: 14 }]}>
            {leavingSoon === 0
              ? 'No groups leaving in the next hour'
              : `${leavingSoon} group${leavingSoon === 1 ? '' : 's'} leaving in the next hour`}
          </Text>
        </View>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Profile' } as never)}>
          <Avatar initials={me.initials} tone="dark" size={42} />
        </Pressable>
      </View>

      {/* From / To */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 18, paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => setPicking('from')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.mint500 }} />
              <View>
                <Text style={type.micro}>From</Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink900, marginTop: 4 }}>{placeById(fromId).name}</Text>
              </View>
            </Pressable>
            <Divider style={{ marginLeft: 26 }} />
            <Pressable onPress={() => setPicking('to')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.amber500 }} />
              <View>
                <Text style={type.micro}>To</Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink900, marginTop: 4 }}>{placeById(toId).name}</Text>
              </View>
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              setFromId(toId);
              setToId(fromId);
            }}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Swap from and to"
          >
            <MaterialCommunityIcons name="swap-vertical" size={22} color={colors.ink900} />
          </Pressable>
        </View>
      </View>

      <SectionLabel>Leaving</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        {WINDOWS.map((w) => (
          <Chip key={w.id} label={w.label} selected={w.id === windowId} onPress={() => setWindowId(w.id)} />
        ))}
        <View style={{ width: 12 }} />
      </ScrollView>

      <View style={{ gap: 10 }}>
        <Button label="Find groups on this route" onPress={() => nav.navigate('GroupList', { fromId, toId, windowId })} />
        <Button
          label="Create a group"
          variant="outline"
          icon="plus"
          onPress={() => nav.navigate('CreateGroup', { fromId, toId, departure: suggestedDeparture(windowId).getTime() })}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
        <Text style={type.heading}>Your next ride</Text>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Groups' } as never)} hitSlop={8}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink500 }}>See all</Text>
        </Pressable>
      </View>
      {next ? (
        <NextRideCard group={next} onPress={() => nav.navigate('GroupDetail', { groupId: next.id })} />
      ) : (
        <View style={{ borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, padding: 18 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink700 }}>No rides booked</Text>
          <Text style={[type.small, { marginTop: 4 }]}>Find a group on your route, or create one and let others join you.</Text>
        </View>
      )}

      <PlacePicker
        visible={picking !== null}
        title={picking === 'from' ? 'Leaving from' : 'Going to'}
        selectedId={picking === 'from' ? fromId : toId}
        onClose={() => setPicking(null)}
        onPick={(id) => picking && pick(picking, id)}
      />
    </Screen>
  );
}
