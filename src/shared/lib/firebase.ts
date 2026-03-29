import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
  type Firestore
} from 'firebase/firestore';
import { cloudServicesReady, firebaseConfig, panelCloudConfig } from '@/shared/lib/cloud-config';
import { normalizeSnapshot } from '@/shared/lib/normalize';
import type { AppSnapshot, CloudUser } from '@/shared/types/domain';

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

const ensureServices = () => {
  if (authInstance && dbInstance) {
    return { auth: authInstance, db: dbInstance };
  }

  const app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);

  if (panelCloudConfig.useEmulators) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', {
      disableWarnings: true
    });
    connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
  }

  return { auth: authInstance, db: dbInstance };
};

export const subscribeToCloudAuth = (callback: (user: CloudUser | null) => void) => {
  if (!cloudServicesReady()) {
    callback(null);
    return () => undefined;
  }

  const { auth } = ensureServices();
  return onAuthStateChanged(auth, (user) =>
    callback(
      user
        ? {
            uid: user.uid,
            email: user.email
          }
        : null
    )
  );
};

export const loginToCloud = async (email: string, password: string) => {
  const { auth } = ensureServices();
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutFromCloud = async () => {
  const { auth } = ensureServices();
  return signOut(auth);
};

export const checkPanelAdminAccess = async (uid: string) => {
  const { db } = ensureServices();
  const adminRef = doc(db, 'panelAdmins', uid);
  const adminSnap = await getDoc(adminRef);
  return adminSnap.exists();
};

export const loadCloudSnapshot = async () => {
  const { db } = ensureServices();
  const metaRef = doc(db, 'panels', panelCloudConfig.panelId, 'meta', 'config');
  const clientsRef = collection(db, 'panels', panelCloudConfig.panelId, 'clients');
  const productsRef = collection(db, 'panels', panelCloudConfig.panelId, 'products');

  const [metaSnap, clientDocs, productDocs] = await Promise.all([
    getDoc(metaRef),
    getDocs(clientsRef),
    getDocs(productsRef)
  ]);

  const metaData = metaSnap.exists() ? metaSnap.data() : {};
  return normalizeSnapshot({
    clients: clientDocs.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    products: productDocs.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    history: metaData.history ?? [],
    routes: metaData.routes ?? [],
    routeSelections: metaData.routeSelections ?? {},
    routeDates: metaData.routeDates ?? {},
    salesGoals: metaData.salesGoals ?? {},
    settings: metaData.settings ?? {},
    meta: {
      migratedFromLegacy: false,
      updatedAt:
        typeof metaData.updatedAt?.toDate === 'function'
          ? metaData.updatedAt.toDate().toISOString()
          : new Date().toISOString()
    }
  });
};

export const saveCloudSnapshot = async (snapshot: AppSnapshot, user: CloudUser) => {
  const { db } = ensureServices();
  const metaRef = doc(db, 'panels', panelCloudConfig.panelId, 'meta', 'config');
  const clientsRef = collection(db, 'panels', panelCloudConfig.panelId, 'clients');
  const productsRef = collection(db, 'panels', panelCloudConfig.panelId, 'products');

  const [existingClientDocs, existingProductDocs] = await Promise.all([
    getDocs(clientsRef),
    getDocs(productsRef)
  ]);

  const batch = writeBatch(db);
  batch.set(
    metaRef,
    {
      history: snapshot.history,
      routes: snapshot.routes,
      routeSelections: snapshot.routeSelections,
      routeDates: snapshot.routeDates,
      salesGoals: snapshot.salesGoals,
      settings: snapshot.settings,
      schemaVersion: snapshot.schemaVersion,
      updatedAt: serverTimestamp(),
      updatedBy: {
        uid: user.uid,
        email: user.email ?? null
      }
    },
    { merge: true }
  );

  const nextClientIds = new Set(snapshot.clients.map((client) => client.id));
  const nextProductIds = new Set(snapshot.products.map((product) => product.id));

  snapshot.clients.forEach((client) => {
    batch.set(doc(db, 'panels', panelCloudConfig.panelId, 'clients', client.id), client);
  });

  snapshot.products.forEach((product) => {
    batch.set(doc(db, 'panels', panelCloudConfig.panelId, 'products', product.id), product);
  });

  existingClientDocs.docs.forEach((entry) => {
    if (!nextClientIds.has(entry.id)) {
      batch.delete(entry.ref);
    }
  });

  existingProductDocs.docs.forEach((entry) => {
    if (!nextProductIds.has(entry.id)) {
      batch.delete(entry.ref);
    }
  });

  await batch.commit();
};
