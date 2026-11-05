import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NextRideCard } from '../components/RideCards';
import { RideRow } from '../components/RideRow';
import { Avatar, Button, Card, Divider, Screen } from '../components/ui';
import { useAuth, useMe } from '../data/auth';
import { myShare } from '../data/groups';
import { EMPTY_SUMMARY, useRatingSummaries } from '../data/ratings';
import { useSession } from '../data/session';
import { formatNu } from '../lib/fare';
import { clearAllReminders } from '../notifications';
import { colors, fonts, type } from '../theme';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 19, color: colors.ink900 }}>{value}</Text>
      <Text style={[type.small, { fontSize: 11.5 }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const nav = useNavigation();
  const me = useMe();
  const { signOut } = useAuth();
  const { upcoming, past } = useSession();
  const summary = useRatingSummaries([me.uid])[me.uid] ?? EMPTY_SUMMARY;

  const shared = past.filter((g) => g.memberIds.length > 1);
  const saved = shared.reduce((sum, g) => sum + (g.fare > 0 ? g.fare - myShare(g) : 0), 0);
  const domain = me.email.split('@')[1] ?? '';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
        <Avatar initials={me.initials} tone="dark" size={56} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.ink900 }}>{me.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.mint100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Feather name="check-circle" size={12} color={colors.mint600} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.mint600 }}>Verified · {domain}</Text>
          </View>
        </View>
      </View>

      <Card style={{ flexDirection: 'row', paddingVertical: 18 }}>
        <Stat value={String(shared.length)} label="rides shared" />
        <View style={{ width: 1, backgroundColor: colors.lineSoft }} />
        <Stat value={formatNu(saved)} label="fare saved" />
        <View style={{ width: 1, backgroundColor: colors.lineSoft }} />
        <Stat value={String(summary.noShows)} label="no-shows" />
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.amber100, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="star" size={18} color={colors.amber600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900 }}>
            {summary.average == null ? 'No ratings yet' : `${summary.average.toFixed(1)} out of 5`}
          </Text>
          <Text style={[type.small, { fontSize: 12 }]}>
            {summary.count === 0 ? 'Riders rate each other after each ride.' : `From ${summary.count} rating${summary.count === 1 ? '' : 's'} by other riders`}
          </Text>
        </View>
      </Card>

      {upcoming[0] ? (
        <>
          <Text style={type.heading}>Next ride</Text>
          <NextRideCard group={upcoming[0]} onPress={() => nav.navigate('GroupDetail', { groupId: upcoming[0].id })} />
        </>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={type.heading}>Recent rides</Text>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Groups' } as never)} hitSlop={8}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink500 }}>See all</Text>
        </Pressable>
      </View>
      {past.length === 0 ? (
        <Text style={type.small}>Your finished rides will appear here.</Text>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {past.slice(0, 5).map((g, i) => (
            <React.Fragment key={g.id}>
              {i > 0 ? <Divider /> : null}
              <RideRow group={g} onPress={() => nav.navigate('GroupDetail', { groupId: g.id })} />
            </React.Fragment>
          ))}
        </Card>
      )}

      <Button
        label="Sign out"
        variant="outline"
        icon="log-out"
        onPress={() =>
          Alert.alert('Sign out?', 'Your ride reminders on this phone will be cleared.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              style: 'destructive',
              onPress: async () => {
                await clearAllReminders();
                await signOut();
              },
            },
          ])
        }
      />
    </Screen>
  );
}
