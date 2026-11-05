// Web build only (used for previews). Phones use authInit.ts.
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export function createAuth(app: FirebaseApp) {
  return getAuth(app);
}
