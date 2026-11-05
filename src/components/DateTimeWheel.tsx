// Scrolling wheel date + time picker, written in plain React Native so it
// looks and works the same on Android and iOS (and needs no native module).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type ScrollViewInstance,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MINUTE_STEP } from '../config';
import { addDays, formatDayShort, formatDeparture, startOfDay } from '../lib/time';
import { colors, fonts } from '../theme';

const ITEM_H = 42;
const VISIBLE = 5;

function WheelColumn({
  items,
  index,
  onChange,
  flex = 1,
}: {
  items: string[];
  index: number;
  onChange: (i: number) => void;
  flex?: number;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const [live, setLive] = useState(index);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Position the wheel on open (contentOffset alone is unreliable on Android).
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (y: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    setLive(i);
    if (i !== index) onChange(i);
    // Snap exactly onto the row (web and slow drags can stop between rows).
    if (Math.abs(y - i * ITEM_H) > 1) ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== live) setLive(i);
    if (Platform.OS === 'web') {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => settle(y), 120);
    }
  };

  return (
    <View style={{ flex, height: ITEM_H * VISIBLE }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * ITEM_H }}
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settle(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(e) => {
          // If there is no fling, momentum end never fires on Android.
          const y = e.nativeEvent.contentOffset.y;
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => settle(y), 180);
        }}
        onMomentumScrollBegin={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
        }}
      >
        {items.map((label, i) => {
          const d = Math.abs(i - live);
          return (
            <Pressable
              key={`${label}-${i}`}
              onPress={() => {
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
                setLive(i);
                onChange(i);
              }}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: d === 0 ? fonts.semibold : fonts.regular,
                  fontSize: d === 0 ? 19 : d === 1 ? 17 : 15,
                  color: d === 0 ? colors.ink900 : d === 1 ? colors.ink500 : colors.ink300,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type Parts = { day: number; hour: number; minute: number; ampm: number };

function toParts(d: Date, days: Date[]): Parts {
  const dayIdx = Math.max(0, days.findIndex((x) => x.getTime() === startOfDay(d).getTime()));
  const h24 = d.getHours();
  return {
    day: dayIdx,
    hour: (h24 % 12 || 12) - 1,
    minute: Math.floor(d.getMinutes() / MINUTE_STEP),
    ampm: h24 >= 12 ? 1 : 0,
  };
}

function fromParts(p: Parts, days: Date[]): Date {
  const d = new Date(days[p.day]);
  const h12 = p.hour + 1;
  const h24 = (h12 % 12) + (p.ampm === 1 ? 12 : 0);
  d.setHours(h24, p.minute * MINUTE_STEP, 0, 0);
  return d;
}

function Sheet({
  value,
  min,
  max,
  onCancel,
  onDone,
}: {
  value: Date;
  min: Date;
  max: Date;
  onCancel: () => void;
  onDone: (d: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let d = startOfDay(min); d.getTime() <= startOfDay(max).getTime(); d = addDays(d, 1)) out.push(d);
    return out;
  }, [min, max]);

  const [parts, setParts] = useState<Parts>(() => toParts(value, days));
  const chosen = fromParts(parts, days);
  const tooEarly = chosen.getTime() < min.getTime();
  const tooLate = chosen.getTime() > max.getTime();

  const dayLabels = days.map((d, i) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDayShort(d)));
  const hourLabels = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minuteLabels = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'));

  const set = (k: keyof Parts) => (i: number) => setParts((p) => ({ ...p, [k]: i }));

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,40,48,0.45)' }]} onPress={onCancel} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.ink500 }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink900 }}>Leaving at</Text>
          <Pressable onPress={() => (tooEarly || tooLate ? undefined : onDone(chosen))} hitSlop={10}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.amber600 }}>Done</Text>
          </Pressable>
        </View>

        <Text style={{ textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: tooEarly || tooLate ? colors.coral500 : colors.ink500, marginBottom: 4 }}>
          {tooEarly
            ? 'That time has passed. Pick a later one.'
            : tooLate
              ? 'Rides can be posted up to a week ahead.'
              : formatDeparture(chosen)}
        </Text>

        <View style={{ height: ITEM_H * VISIBLE, justifyContent: 'center' }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: ITEM_H * Math.floor(VISIBLE / 2),
              height: ITEM_H,
              borderRadius: 10,
              backgroundColor: colors.sunken,
            }}
          />
          <View style={{ flexDirection: 'row' }}>
            <WheelColumn items={dayLabels} index={parts.day} onChange={set('day')} flex={2.2} />
            <WheelColumn items={hourLabels} index={parts.hour} onChange={set('hour')} />
            <WheelColumn items={minuteLabels} index={parts.minute} onChange={set('minute')} />
            <WheelColumn items={['AM', 'PM']} index={parts.ampm} onChange={set('ampm')} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function DateTimeWheel({
  visible,
  value,
  min,
  max,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: Date;
  min: Date;
  max: Date;
  onClose: () => void;
  onChange: (d: Date) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <Sheet
          value={value}
          min={min}
          max={max}
          onCancel={onClose}
          onDone={(d) => {
            onChange(d);
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}
