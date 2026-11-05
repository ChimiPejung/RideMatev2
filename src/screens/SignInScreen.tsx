import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button, ErrorText, Field, Header, Notice, Screen } from '../components/ui';
import { authErrorMessage, useAuth } from '../data/auth';
import { auth } from '../data/firebase';
import type { ScreenProps } from '../navigation/types';
import { colors, fonts, type } from '../theme';

export default function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setInfo(null);
    if (!email.includes('@') || password.length === 0) {
      setError('Enter your college email and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.includes('@')) {
      setError('Enter your college email first, then tap reset.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError(null);
      setInfo(`We sent a reset link to ${email.trim()}.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen header={<Header />}>
        <View style={{ gap: 10 }}>
          <Text style={type.title}>Welcome back</Text>
          <Text style={type.small}>Log in with the college email you signed up with.</Text>
        </View>
        <Field
          label="College email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          placeholder="02240148.cst@rub.edu.bt"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          placeholder="Your password"
          secureTextEntry
          textContentType="password"
          onSubmitEditing={submit}
        />
        <ErrorText>{error}</ErrorText>
        {info ? <Notice icon="mail">{info}</Notice> : null}
        <Button label="Log in" variant="dark" onPress={submit} loading={busy} />
        <Pressable onPress={reset} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 }}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.replace('SignUp')} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink500 }}>
            New here? <Text style={{ fontFamily: fonts.semibold, color: colors.ink900 }}>Create an account.</Text>
          </Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
