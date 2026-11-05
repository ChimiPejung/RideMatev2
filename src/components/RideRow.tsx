import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { myShare, rideTypeLabel, routeLabel } from '../data/groups';
import type { RideGroup } from '../data/types';
import { formatNu } from '../lib/fare';
import { formatDate, formatDayRelative, formatTime } from '../lib/time';
import { colors, fonts, type } from '../theme';

/** Compact row used for past rides on My rides and Profile. */
export function RideRow({ group, right, onPress }: { group: RideGroup; right?: React.ReactNode; onPress: () => void }) {
  const n = group.memberIds.length;
  const rel = formatDayRelative(group.departure);
  const when = rel === 'Today' || rel === 'Yesterday' || rel === 'Tomorrow' ? rel : formatDate(group.departure);
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900 }}>
          {routeLabel(group)} · {group.fare === 0 ? 'free ride' : `${n} rider${n === 1 ? '' : 's'}`}
        </Text>
        <Text style={[type.small, { fontSize: 12, marginTop: 2 }]}>
          {when} · {formatTime(group.departure)} · {rideTypeLabel(group)}
        </Text>
      </View>
      {right ?? (
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: group.fare === 0 ? colors.mint600 : colors.ink900 }}>
          {group.fare === 0 ? 'Free' : formatNu(myShare(group))}
        </Text>
      )}
    </Pressable>
  );
}
