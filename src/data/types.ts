import type { RideType } from '../config';

export type Student = {
  uid: string;
  name: string;
  email: string;
  initials: string;
};

export type Member = {
  name: string;
  initials: string;
  joinedAt: number; // ms
};

export type RideGroup = {
  id: string;
  routeKey: string;
  fromId: string;
  toId: string;
  departure: Date;
  rideType: RideType;
  pickup: string;
  fare: number; // whole-taxi fare in Nu.; 0 for a free ride
  seats: number;
  createdBy: string;
  memberIds: string[];
  members: Record<string, Member>;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: Date;
  system?: boolean;
};

export type DmThread = {
  id: string;
  members: string[];
  names: Record<string, string>;
  initials: Record<string, string>;
  lastText: string;
  lastSenderId: string;
  updatedAt: Date;
  context?: string; // e.g. "Rider in your 5:00 PM group"
};

export type Rating = {
  id: string;
  groupId: string;
  raterId: string;
  ratedId: string;
  stars: number; // 1..5, or 0 when marked as a no-show
  noShow: boolean;
};

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
