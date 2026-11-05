import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { Button, ErrorText, Field, Header, Notice, Screen } from '../components/ui';
import { ALLOWED_EMAIL_DOMAINS } from '../config';
import { authErrorMessage, isCollegeEmail, useAuth } from '../data/auth';
import type { ScreenProps } from '../navigation/types';
import { colors, fonts, type } from '../theme';

export default function SignUpScreen({ navigation }: ScreenProps<'SignUp'>) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = 'Enter your full name.';
    if (!isCollegeEmail(email)) e.email = `Use your college email (${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(' or ')}).`;
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await signUp(name, email, password);
      // Navigation switches to the Verify screen automatically.
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen header={<Header step="Step 1 of 2" />}>
        <View style={{ gap: 10 }}>
          <Text style={type.title}>Create your{'\n'}account</Text>
          <Text style={type.small}>
            RideMate is closed to everyone outside your college. Sign up with the address your college gave you.
          </Text>
        </View>

        <Field
          label="Full name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
          placeholder="Sonam Dorji"
          autoCapitalize="words"
          textContentType="name"
          helper="Riders see your real name in the group. It keeps everyone accountable."
          error={errors.name}
        />
        <Field
          label="College email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrors((x) => ({ ...x, email: undefined }));
          }}
          placeholder="02240148.cst@rub.edu.bt"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          helper="Gmail, Hotmail and other personal addresses are rejected."
          error={errors.email}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setErrors((x) => ({ ...x, password: undefined }));
          }}
          placeholder="At least 8 characters"
          secureTextEntry
          textContentType="newPassword"
          error={errors.password}
        />

        <Notice>Verified once, trusted after. Only students who clear this step can see a group or join a ride.</Notice>
        <ErrorText>{errors.form}</ErrorText>

        <Button label="Send verification link" variant="dark" onPress={submit} loading={busy} />
        <Pressable onPress={() => navigation.replace('SignIn')} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink500 }}>
            Already verified? <Text style={{ fontFamily: fonts.semibold, color: colors.ink900 }}>Log in instead.</Text>
          </Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
