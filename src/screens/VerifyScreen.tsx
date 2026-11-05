import React, { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, ErrorText, Header, Notice, Screen } from '../components/ui';
import { authErrorMessage, useAuth } from '../data/auth';
import { colors, fonts, type } from '../theme';

/**
 * Step 2 of 2. Firebase verifies email with a link (the Project 1 design showed a
 * 6-digit code; the link does the same job and needs no server).
 */
export default function VerifyScreen() {
  const { pendingEmail, checkVerified, resendVerification, switchAddress } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Check again automatically when the student comes back from their mail app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkVerified().catch(() => {});
    });
    const poll = setInterval(() => checkVerified().catch(() => {}), 6000);
    return () => {
      sub.remove();
      clearInterval(poll);
    };
  }, [checkVerified]);

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await checkVerified();
      if (!ok) setError('Not verified yet. Open the link in the email, then tap again.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      await resendVerification();
      setInfo('A new link is on its way.');
      setCooldown(30);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <Screen header={<Header step="Step 2 of 2" onBack={switchAddress} />}>
      <View style={{ gap: 10 }}>
        <Text style={type.title}>Check your{'\n'}college inbox</Text>
        <Text style={type.small}>We sent a verification link to</Text>
        <View style={{ alignSelf: 'flex-start', backgroundColor: colors.sunken, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink900 }}>{pendingEmail}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.lineSoft, padding: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.amber100, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="mail" size={20} color={colors.amber600} />
        </View>
        <Text style={[type.body, { flex: 1, fontSize: 14 }]}>
          Open the email from RideMate and tap the link. This screen moves on by itself once you have.
        </Text>
      </View>

      <Text style={[type.small, { fontSize: 12 }]}>
        Didn’t get it?{' '}
        <Text onPress={resend} style={{ fontFamily: fonts.semibold, color: cooldown > 0 ? colors.ink300 : colors.ink900 }}>
          {cooldown > 0 ? `Resend in 0:${cooldown.toString().padStart(2, '0')}` : 'Resend link'}
        </Text>
      </Text>

      <Notice>Check your spam folder too. If your college inbox blocks it, ask the college IT desk.</Notice>
      {info ? <Notice icon="send">{info}</Notice> : null}
      <ErrorText>{error}</ErrorText>

      <View style={{ height: 24 }} />
      <Button label="I’ve verified, continue" onPress={verify} loading={busy} />
      <Button label="Use a different address" variant="outline" onPress={switchAddress} />
    </Screen>
  );
}
