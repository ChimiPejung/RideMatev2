// Local notifications only (no server, no paid Apple account). Works in Expo Go.
//  - A departure reminder is scheduled on the phone, so it arrives even if the app is closed.
//  - Join/leave/full/new-message alerts come from the live Firestore listeners,
//    so they only appear while the app is open or recently in the background.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { REMINDER_MINUTES } from './config';
import { formatTime } from './lib/time';

const CHANNEL = 'rides';

// Show banners even when the app is in the foreground (iOS hides them by default).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<unknown> | null = null;
function ensureChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rides and messages',
      // Re-exported via `export *`; eslint-plugin-import can't follow it.
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return channelReady;
}

/** Ask only when it is obviously useful: the first time a student creates or joins a group. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function hasPermission() {
  if (Platform.OS === 'web') return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

export type NotifyTarget = { screen: 'GroupDetail' | 'GroupChat'; groupId: string } | { screen: 'DirectChat'; threadId: string };

export async function notifyNow(title: string, body: string, target: NotifyTarget) {
  if (!(await hasPermission())) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: target as unknown as Record<string, unknown> },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}

// ---------------------------------------------------------------- departure reminders

const reminderId = (groupId: string) => `depart-${groupId}`;
const scheduled = new Map<string, number>(); // groupId -> reminder time (ms)

export type ReminderGroup = { id: string; departure: Date; title: string };

/**
 * Keeps exactly one reminder per upcoming group the student is in.
 * Called whenever the list of "my groups" changes, so leaving a group or a
 * time change cancels or moves the reminder.
 */
export async function syncReminders(groups: ReminderGroup[]) {
  if (!(await hasPermission())) return;
  await ensureChannel();
  const now = Date.now();
  const wanted = new Map<string, ReminderGroup & { at: number }>();
  for (const g of groups) {
    const at = g.departure.getTime() - REMINDER_MINUTES * 60 * 1000;
    if (at > now + 5_000) wanted.set(g.id, { ...g, at });
  }

  // Pick up reminders left from a previous app session.
  if (scheduled.size === 0) {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.identifier.startsWith('depart-')) scheduled.set(n.identifier.slice(7), -1);
    }
  }

  for (const [groupId, at] of scheduled) {
    const w = wanted.get(groupId);
    if (!w || w.at !== at) {
      await Notifications.cancelScheduledNotificationAsync(reminderId(groupId)).catch(() => {});
      scheduled.delete(groupId);
    }
  }

  for (const [groupId, w] of wanted) {
    if (scheduled.has(groupId)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(groupId),
      content: {
        title: `Your ride leaves in ${REMINDER_MINUTES} minutes`,
        body: `${w.title} at ${formatTime(w.departure)}. Head to the pick-up point.`,
        data: { screen: 'GroupDetail', groupId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: w.at,
        channelId: CHANNEL,
      },
    });
    scheduled.set(groupId, w.at);
  }
}

export async function clearAllReminders() {
  scheduled.clear();
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

// ---------------------------------------------------------------- which chat is open

let openChat: string | null = null;
/** Chat screens call this so we don't notify about the chat being read. */
export function setOpenChat(key: string | null) {
  openChat = key;
}
export function isChatOpen(key: string) {
  return openChat === key;
}
