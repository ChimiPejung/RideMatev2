import React from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, SeatStrip } from '../components/ui';
import type { ScreenProps } from '../navigation/types';
import { colors, fonts, type } from '../theme';

export default function WelcomeScreen({ navigation }: ScreenProps<'Welcome'>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink900 }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 36 }}>
        <Text style={[type.micro, { color: colors.amber500, letterSpacing: 2 }]}>RideMate</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: '#FFFFFF', marginTop: 14, letterSpacing: -1 }}>
          Nobody rides{'\n'}alone.
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink300, marginTop: 16, maxWidth: 330 }}>
          Find the students already heading your way, share one taxi, and split what it costs.
        </Text>

        <View
          style={{
            marginTop: 40,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.ink700,
            backgroundColor: '#14323B',
            padding: 18,
            gap: 16,
          }}
        >
          <Text style={[type.micro, { color: colors.ink300 }]}>Town → Campus · 5:00 PM</Text>
          <SeatStrip initials={['S', 'P', 'T']} seats={4} onDark />
          <View style={{ height: 1, backgroundColor: colors.ink700 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink300 }}>Nu. 200 total</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.ink500, marginTop: 2 }}>3 riders sharing</Text>
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.amber500 }}>Nu. 67 each</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: 12, paddingBottom: 12 }}>
          <Button label="Create your account" onPress={() => navigation.navigate('SignUp')} />
          <Button label="I already have an account" variant="outlineDark" onPress={() => navigation.navigate('SignIn')} />
          <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.ink500, marginTop: 4 }}>
            Open only to verified college students.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
