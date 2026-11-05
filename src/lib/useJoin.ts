import { useState } from 'react';
import { Alert } from 'react-native';
import { useMe } from '../data/auth';
import { GroupError, joinGroup } from '../data/groups';
import { ensurePermission } from '../notifications';

/** Join with a spinner per group, a friendly error, and the notification prompt. */
export function useJoin() {
  const me = useMe();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const join = async (groupId: string) => {
    setJoiningId(groupId);
    try {
      await joinGroup(groupId, me);
      ensurePermission().catch(() => {});
      return true;
    } catch (e) {
      const msg = e instanceof GroupError ? e.message : 'Couldn’t join. Check your connection and try again.';
      Alert.alert('Couldn’t join', msg);
      return false;
    } finally {
      setJoiningId(null);
    }
  };
  return { join, joiningId };
}
