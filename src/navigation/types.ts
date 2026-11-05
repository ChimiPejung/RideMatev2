import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DmPeer } from '../data/chat';
import type { WindowId } from '../lib/time';

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Verify: undefined;
  Tabs: undefined;
  GroupList: { fromId: string; toId: string; windowId: WindowId };
  CreateGroup: { fromId: string; toId: string; departure: number };
  GroupDetail: { groupId: string };
  GroupChat: { groupId: string };
  DirectChat: { threadId?: string; peer?: DmPeer; context?: string };
  RateRiders: { groupId: string };
};

export type TabParamList = {
  Rides: undefined;
  Groups: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type ScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
