import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser ? auth.currentUser.uid : null,
      email: auth.currentUser ? auth.currentUser.email : null,
      emailVerified: auth.currentUser ? auth.currentUser.emailVerified : null,
      isAnonymous: auth.currentUser ? auth.currentUser.isAnonymous : null,
      tenantId: auth.currentUser ? auth.currentUser.tenantId : null,
      providerInfo: auth.currentUser && auth.currentUser.providerData ? auth.currentUser.providerData.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) : []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
