import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radius, type } from '../theme';

// ---------------------------------------------------------------- layout

export function Screen({
  children,
  scroll = true,
  footer,
  header,
  dark = false,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  dark?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const bg = dark ? colors.ink900 : colors.canvas;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
      {header}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ padding: 20, paddingBottom: 32, gap: 16 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </SafeAreaView>
  );
}

export function StickyFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.lineSoft,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12) + 4,
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

export function Header({
  title,
  subtitle,
  right,
  onBack,
  step,
  left,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  step?: string;
  left?: React.ReactNode;
}) {
  const nav = useNavigation();
  const back = onBack ?? (() => nav.goBack());
  return (
    <View style={styles.header}>
      <Pressable onPress={back} style={styles.backBtn} hitSlop={8} accessibilityLabel="Back">
        <Feather name="chevron-left" size={22} color={colors.ink900} />
      </Pressable>
      {left}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={type.screenTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {step ? <Text style={type.micro}>{step}</Text> : null}
      {right}
    </View>
  );
}

export function Card({ children, style, dark = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return <View style={[dark ? styles.cardDark : styles.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.lineSoft }, style]} />;
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.micro, { marginBottom: -6 }, style]}>{children}</Text>;
}

// ---------------------------------------------------------------- buttons

type BtnVariant = 'primary' | 'dark' | 'outline' | 'outlineDark' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  small = false,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ComponentProps<typeof Feather>['name'];
}) {
  const v = btnStyles[variant];
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        v.box,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Feather name={icon} size={small ? 15 : 18} color={v.text.color as string} /> : null}
          <Text style={[styles.btnText, small && { fontSize: 14 }, v.text]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const btnStyles: Record<BtnVariant, { box: ViewStyle; text: TextStyle }> = {
  primary: { box: { backgroundColor: colors.amber500 }, text: { color: colors.ink900 } },
  dark: { box: { backgroundColor: colors.ink900 }, text: { color: '#FFFFFF' } },
  outline: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong }, text: { color: colors.ink900 } },
  outlineDark: { box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink700 }, text: { color: '#FFFFFF' } },
  danger: { box: { backgroundColor: 'transparent', height: 34 }, text: { color: colors.coral500, fontSize: 14 } },
};

export function Chip({
  label,
  selected,
  onPress,
  muted = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: colors.ink900, borderColor: colors.ink900 } : muted && { backgroundColor: colors.sunken },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- badges, seats, avatars

type BadgeTone = 'mint' | 'amber' | 'grey' | 'mintDark';

export function Badge({ label, tone = 'mint' }: { label: string; tone?: BadgeTone }) {
  const t = {
    mint: { bg: colors.mint100, fg: colors.mint600 },
    mintDark: { bg: colors.mint100, fg: colors.mint600 },
    amber: { bg: colors.amber100, fg: colors.amber600 },
    grey: { bg: colors.sunken, fg: colors.ink500 },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function SeatStrip({
  initials,
  seats,
  muted = false,
  size = 30,
  onDark = false,
}: {
  initials: string[];
  seats: number;
  muted?: boolean;
  size?: number;
  onDark?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: seats }, (_, i) => {
        const who = initials[i];
        if (!who) {
          return (
            <View
              key={i}
              style={{
                width: size,
                height: size,
                borderRadius: 8,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: onDark ? colors.ink700 : colors.ink300,
              }}
            />
          );
        }
        return (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: 8,
              backgroundColor: muted ? colors.ink300 : colors.amber500,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.4, color: muted ? '#FFFFFF' : colors.ink900 }}>
              {who.slice(0, 1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Avatar({ initials, tone = 'amber', size = 40 }: { initials: string; tone?: 'amber' | 'dark'; size?: number }) {
  const dark = tone === 'dark';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: dark ? colors.ink900 : colors.amber100,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.34, color: dark ? '#FFFFFF' : colors.amber600 }}>
        {initials.slice(0, 2)}
      </Text>
    </View>
  );
}

export function RatingText({ average, count }: { average: number | null; count: number }) {
  if (average == null || count === 0) {
    return <Text style={[type.label, { color: colors.ink500 }]}>New rider</Text>;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Feather name="star" size={12} color={colors.amber600} />
      <Text style={[type.label, { color: colors.ink700 }]}>
        {average.toFixed(1)} <Text style={{ color: colors.ink500 }}>({count})</Text>
      </Text>
    </View>
  );
}

export function StarInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = !disabled && n <= value;
        return (
          <Pressable
            key={n}
            onPress={disabled ? undefined : () => onChange(n)}
            hitSlop={4}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.amber500 : colors.sunken,
              opacity: disabled ? 0.5 : 1,
            }}
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Feather name="star" size={18} color={on ? colors.ink900 : colors.ink300} />
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- notices and fields

export function Notice({ children, tone = 'mint', icon = 'check-circle' }: { children: React.ReactNode; tone?: 'mint' | 'amber' | 'coral'; icon?: React.ComponentProps<typeof Feather>['name'] }) {
  const t = {
    mint: { bg: colors.mint100, fg: colors.mint600 },
    amber: { bg: colors.amber100, fg: colors.amber600 },
    coral: { bg: '#FBE3DC', fg: colors.coral500 },
  }[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: t.bg }}>
      <Feather name={icon} size={16} color={t.fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: t.fg }}>{children}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.coral500 }}>{children}</Text>;
}

export function Field({
  label,
  helper,
  error,
  style,
  ...input
}: TextInputProps & { label: string; helper?: string; error?: string | null }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 8 }, style as ViewStyle]}>
      <Text style={type.micro}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.ink300}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && { borderColor: colors.amber500, borderWidth: 1.5 },
          !!error && { borderColor: colors.coral500 },
        ]}
      />
      {error ? <ErrorText>{error}</ErrorText> : helper ? <Text style={[type.small, { fontSize: 12 }]}>{helper}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
      <ActivityIndicator color={colors.ink900} />
    </View>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
      <Text style={type.heading}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center' }]}>{body}</Text>
      {children ? <View style={{ marginTop: 10, alignSelf: 'stretch' }}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 16,
  },
  cardDark: {
    backgroundColor: colors.ink900,
    borderRadius: radius.lg,
    padding: 18,
  },
  btn: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnSmall: { height: 40, borderRadius: 10, paddingHorizontal: 16 },
  btnText: { fontFamily: fonts.semibold, fontSize: 16 },
  chip: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink900 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.8 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink900,
  },
});
