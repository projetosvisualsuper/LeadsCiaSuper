import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

import { getStorage } from 'firebase/storage';

// Singleton to avoid re-initializing during hot reloads in development
const app = firebaseConfig.apiKey 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

// Inicializa o Firestore com cache persistente no lado do cliente apenas se o app foi inicializado
const db = app 
  ? ((typeof window !== 'undefined'
      ? initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager() // Compartilha o cache de forma segura entre várias abas
          })
        })
      : getFirestore(app)) as any)
  : ({} as any);

const auth = app ? getAuth(app) : ({} as any);
const storage = app ? getStorage(app) : ({} as any);

export { app, db, auth, storage };
