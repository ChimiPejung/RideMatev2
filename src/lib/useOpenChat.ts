import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { setOpenChat } from '../notifications';

/** Marks a chat as open while its screen is focused, so it doesn't notify itself. */
export function useOpenChat(key: string | null) {
  useFocusEffect(
    useCallback(() => {
      setOpenChat(key);
      return () => setOpenChat(null);
    }, [key]),
  );
}
