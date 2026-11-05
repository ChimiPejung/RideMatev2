import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DateTimeWheel } from '../components/DateTimeWheel';
import { PlacePicker } from '../components/PlacePicker';
import { Button, Divider, ErrorText, Field, Header, Screen, SectionLabel } from '../components/ui';
import { defaultFare, MAX_SEATS, placeById, RIDE_TYPES, type RideType } from '../config';
import { useMe } from '../data/auth';
import { createGroup } from '../data/groups';
import { farePerPerson, formatNu } from '../lib/fare';
import { formatDeparture, latestBookable, roundUpToStep } from '../lib/time';
import { ensurePermission } from '../notifications';
import type { ScreenProps } from '../navigation/types';
import { colors, fonts, type } from '../theme';

export default function CreateGroupScreen({ route, navigation }: ScreenProps<'CreateGroup'>) {
  const me = useMe();
  const [fromId, setFromId] = useState(route.params.fromId);
  const [toId, setToId] = useState(route.params.toId);
  const [departure, setDeparture] = useState(() => {
    const min = roundUpToStep();
    const d = new Date(route.params.departure);
    return d.getTime() < min.getTime() ? min : roundUpToStep(d);
  });
  const [rideType, setRideType] = useState<RideType>('taxi');
  const [driving, setDriving] = useState(false);
  const [fareText, setFareText] = useState(String(defaultFare(route.params.fromId, route.params.toId)));
  const [pickup, setPickup] = useState('Main gate');
  const [wheelOpen, setWheelOpen] = useState(false);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const free = rideType === 'car' && driving;
  const fare = free ? 0 : parseInt(fareText.replace(/\D/g, ''), 10) || 0;
  const minTime = roundUpToStep();
  const maxTime = latestBookable();

  const pickPlace = (which: 'from' | 'to', id: string) => {
    let f = fromId;
    let t = toId;
    if (which === 'from') {
      if (id === toId) t = fromId;
      f = id;
    } else {
      if (id === fromId) f = toId;
      t = id;
    }
    setFromId(f);
    setToId(t);
    setFareText(String(defaultFare(f, t)));
  };

  const submit = async () => {
    setError(null);
    if (departure.getTime() <= Date.now()) return setError('That time has passed. Pick a later departure.');
    if (departure.getTime() > maxTime.getTime()) return setError('Rides can be posted up to a week ahead.');
    if (!free && (fare < 1 || fare > 10000)) return setError('Enter the fare for the whole ride, in Nu.');
    if (pickup.trim().length > 80) return setError('Keep the pick-up point short.');
    setBusy(true);
    try {
      const id = await createGroup({ fromId, toId, departure, rideType, pickup, fare }, me);
      ensurePermission().catch(() => {});
      navigation.replace('GroupDetail', { groupId: id });
    } catch (e) {
      console.warn(e);
      setError('Couldn’t post the group. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const unit = rideType === 'taxi' ? 'taxi' : rideType === 'auto' ? 'auto' : 'car';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen
        header={<Header title="Start a new group" />}
        footer={<Button label="Create group and post it" onPress={submit} loading={busy} />}
        contentStyle={{ paddingTop: 4 }}
      >
        {/* Route */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 16 }}>
          {(['from', 'to'] as const).map((which, i) => (
            <React.Fragment key={which}>
              {i === 1 ? <Divider /> : null}
              <Pressable onPress={() => setPicking(which)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.micro}>{which === 'from' ? 'From' : 'To'}</Text>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink900, marginTop: 4 }}>
                    {placeById(which === 'from' ? fromId : toId).name}
                  </Text>
                </View>
                <Feather name="edit-2" size={16} color={colors.ink500} />
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* Leaving at */}
        <SectionLabel>Leaving at</SectionLabel>
        <Pressable
          onPress={() => setWheelOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.ink900 }}
        >
          <Feather name="clock" size={18} color={colors.amber500} />
          <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: '#FFFFFF' }}>{formatDeparture(departure)}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink300 }}>Change</Text>
        </Pressable>

        {/* Ride type */}
        <SectionLabel>Ride type</SectionLabel>
        <View style={{ flexDirection: 'row', backgroundColor: colors.sunken, borderRadius: 12, padding: 4 }}>
          {RIDE_TYPES.map((r) => {
            const on = r.id === rideType;
            return (
              <Pressable
                key={r.id}
                onPress={() => setRideType(r.id)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.surface : 'transparent',
                }}
              >
                <Text style={{ fontFamily: on ? fonts.semibold : fonts.medium, fontSize: 14, color: on ? colors.ink900 : colors.ink500 }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {rideType === 'car' ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900, flex: 1 }}>I’m driving, offer this ride free</Text>
              <Switch
                value={driving}
                onValueChange={setDriving}
                trackColor={{ false: colors.lineStrong, true: colors.mint500 }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text style={type.small}>Turn this on and no fare split applies. Riders just take a seat in your car.</Text>
          </View>
        ) : null}

        {/* Fare */}
        {!free ? (
          <>
            <SectionLabel>Estimated fare</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.amber500, backgroundColor: colors.surface, paddingHorizontal: 16 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink900, marginRight: 6 }}>Nu.</Text>
              <TextInput
                value={fareText}
                onChangeText={(t) => setFareText(t.replace(/\D/g, '').slice(0, 5))}
                keyboardType="number-pad"
                style={{ flex: 1, minWidth: 0, fontFamily: fonts.bold, fontSize: 17, color: colors.ink900, paddingVertical: 0 }}
                accessibilityLabel="Fare for the whole ride"
              />
              <Text numberOfLines={1} style={{ flexShrink: 0, marginLeft: 8, fontFamily: fonts.regular, fontSize: 12, color: colors.ink500 }}>for the whole {unit}</Text>
            </View>
          </>
        ) : null}

        <View style={{ backgroundColor: free ? colors.mint100 : colors.amber100, borderRadius: 14, padding: 16, gap: 8 }}>
          {free ? (
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.mint600 }}>
              Free ride: up to {MAX_SEATS - 1} students can take a seat with you.
            </Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.amber600 }}>You alone</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.amber600 }}>{formatNu(fare)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.amber600 }}>When {MAX_SEATS - 1} more join</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.amber600 }}>{formatNu(farePerPerson(fare, MAX_SEATS))} each</Text>
              </View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.amber600 }}>
                Groups are capped at {MAX_SEATS} riders, one {unit}, one fare.
              </Text>
            </>
          )}
        </View>

        <Field label="Pick-up point" value={pickup} onChangeText={setPickup} placeholder="Main gate" maxLength={80} />
        <ErrorText>{error}</ErrorText>
      </Screen>

      <DateTimeWheel
        visible={wheelOpen}
        value={departure}
        min={minTime}
        max={maxTime}
        onClose={() => setWheelOpen(false)}
        onChange={setDeparture}
      />
      <PlacePicker
        visible={picking !== null}
        title={picking === 'from' ? 'Leaving from' : 'Going to'}
        selectedId={picking === 'from' ? fromId : toId}
        onClose={() => setPicking(null)}
        onPick={(id) => picking && pickPlace(picking, id)}
      />
    </KeyboardAvoidingView>
  );
}
