import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { placeById } from '../config';
import { isFull, myShare, orderedMembers, rideTypeLabel, routeLabel, seatsLeft } from '../data/groups';
import type { RideGroup } from '../data/types';
import { farePerPerson, formatNu } from '../lib/fare';
import { formatDayRelative, formatTime } from '../lib/time';
import { colors, fonts } from '../theme';
import { Badge, Button, Divider, SeatStrip } from './ui';

export function seatBadge(g: RideGroup): { label: string; tone: 'mint' | 'amber' | 'grey' } {
  if (isFull(g)) return { label: 'Full', tone: 'grey' };
  if (g.fare === 0) return { label: 'Free ride', tone: 'amber' };
  const left = seatsLeft(g);
  return { label: `${left} seat${left === 1 ? '' : 's'} open`, tone: 'mint' };
}

/** Dark "Your next ride" card used on Home and Profile. */
export function NextRideCard({ group, onPress }: { group: RideGroup; onPress: () => void }) {
  const day = formatDayRelative(group.departure);
  const badge = seatBadge(group);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colors.ink900, borderRadius: 18, padding: 18, gap: 16 }, pressed && { opacity: 0.92 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF' }}>
            {day === 'Today' ? '' : `${day} · `}
            {formatTime(group.departure)} · {rideTypeLabel(group)}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink300, marginTop: 4 }} numberOfLines={1}>
            {routeLabel(group)}
            {group.pickup ? ` · ${group.pickup}` : ''}
          </Text>
        </View>
        <Badge label={badge.label} tone={badge.tone} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <SeatStrip initials={orderedMembers(group).map((m) => m.initials)} seats={group.seats} onDark />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.amber500 }}>
            {group.fare === 0 ? 'Free' : formatNu(myShare(group))}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.ink300 }}>
            {group.fare === 0 ? 'student driver' : 'each right now'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** White group card on the ride board. */
export function GroupCard({
  group,
  isMine,
  onOpen,
  onJoin,
  joining,
}: {
  group: RideGroup;
  isMine: boolean;
  onOpen: () => void;
  onJoin: () => void;
  joining: boolean;
}) {
  const full = isFull(group);
  const muted = full && !isMine;
  const n = group.memberIds.length;
  const badge = seatBadge(group);
  const free = group.fare === 0;
  const hint = free
    ? `${seatsLeft(group)} seat${seatsLeft(group) === 1 ? '' : 's'} going spare`
    : full
      ? 'Full · fare is as low as it goes'
      : `Drops to ${formatNu(farePerPerson(group.fare, n + 1))} if one more joins`;
  const day = formatDayRelative(group.departure);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        {
          backgroundColor: muted ? colors.sunken : colors.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.lineSoft,
          padding: 16,
          gap: 14,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: muted ? colors.ink500 : colors.ink900 }}>
            {day === 'Today' ? '' : `${day} · `}
            {formatTime(group.departure)} · {rideTypeLabel(group)}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink500, marginTop: 3 }} numberOfLines={1}>
            {group.pickup ? `Pick-up: ${group.pickup}` : `From ${placeById(group.fromId).name}`}
          </Text>
        </View>
        <Badge label={isMine ? 'Your group' : badge.label} tone={isMine ? 'amber' : badge.tone} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <SeatStrip initials={orderedMembers(group).map((m) => m.initials)} seats={group.seats} muted={muted} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: free ? colors.mint600 : muted ? colors.ink500 : colors.ink900 }}>
            {free ? 'Free' : formatNu(myShare(group))}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.ink500 }}>{free ? 'no split' : 'each'}</Text>
        </View>
      </View>

      <Divider />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink500 }}>{hint}</Text>
        {isMine ? (
          <Button label="Open" small variant="outline" onPress={onOpen} />
        ) : full ? null : (
          <Button label="Join" small variant="dark" onPress={onJoin} loading={joining} />
        )}
      </View>
    </Pressable>
  );
}
