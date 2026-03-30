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
  type Firestore,
  type WriteBatch
} from 'firebase/firestore';
import { cloudServicesReady, firebaseConfig, panelCloudConfig } from '@/shared/lib/cloud-config';
import { normalizeSnapshot } from '@/shared/lib/normalize';
import type {
  AppSnapshot,
  CloudUser,
  SyncLedger
} from '@/shared/types/domain';

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
  const panelRoot = ['panels', panelCloudConfig.panelId] as const;
  const metaRef = doc(db, ...panelRoot, 'meta', 'config');
  const clientsRef = collection(db, ...panelRoot, 'clients');
  const productsRef = collection(db, ...panelRoot, 'products');
  const tasksRef = collection(db, ...panelRoot, 'tasks');
  const savedViewsRef = collection(db, ...panelRoot, 'savedViews');

  const [metaSnap, clientDocs, productDocs, taskDocs, savedViewDocs] = await Promise.all([
    getDoc(metaRef),
    getDocs(clientsRef),
    getDocs(productsRef),
    getDocs(tasksRef),
    getDocs(savedViewsRef)
  ]);

  const metaData = metaSnap.exists() ? metaSnap.data() : {};
  return normalizeSnapshot({
    clients: clientDocs.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    products: productDocs.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    tasks: taskDocs.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    savedViews: savedViewDocs.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    history: metaData.history ?? [],
    routes: metaData.routes ?? [],
    routeSelections: metaData.routeSelections ?? {},
    routeDates: metaData.routeDates ?? {},
    settings: metaData.settings ?? {},
    meta: {
      migratedFromLegacy: false,
      updatedAt:
        typeof metaData.updatedAt?.toDate === 'function'
          ? metaData.updatedAt.toDate().toISOString()
          : new Date().toISOString(),
      syncLedger: {
        lastSuccessfulSyncAt:
          typeof metaData.updatedAt?.toDate === 'function'
            ? metaData.updatedAt.toDate().toISOString()
            : null,
        dirtyClients: {},
        dirtyProducts: {},
        dirtyRoutes: {},
        dirtyTasks: {},
        dirtySavedViews: {},
        dirtySettings: false,
        lastError: null
      }
    }
  });
};

const createFullLedger = (snapshot: AppSnapshot): SyncLedger => ({
  lastSuccessfulSyncAt: snapshot.meta.syncLedger.lastSuccessfulSyncAt,
  dirtyClients: Object.fromEntries(snapshot.clients.map((client) => [client.id, 'upsert'] as const)),
  dirtyProducts: Object.fromEntries(snapshot.products.map((product) => [product.id, 'upsert'] as const)),
  dirtyRoutes: Object.fromEntries(snapshot.routes.map((route) => [route.id, 'upsert'] as const)),
  dirtyTasks: Object.fromEntries(snapshot.tasks.map((task) => [task.id, 'upsert'] as const)),
  dirtySavedViews: Object.fromEntries(snapshot.savedViews.map((view) => [view.id, 'upsert'] as const)),
  dirtySettings: true,
  lastError: null
});

const applyCollectionChanges = <T extends { id: string }>(
  batch: WriteBatch,
  db: Firestore,
  pathSegments: readonly [string, string, string],
  entities: T[],
  dirtyEntries: Record<string, 'upsert' | 'delete'>
) => {
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  Object.entries(dirtyEntries).forEach(([id, operation]) => {
    const docRef = doc(db, pathSegments[0], pathSegments[1], pathSegments[2], id);
    if (operation === 'delete') {
      batch.delete(docRef);
      return;
    }

    const entity = entityMap.get(id);
    if (entity) {
      batch.set(docRef, entity);
    }
  });
};

export const saveCloudSnapshot = async (
  snapshot: AppSnapshot,
  user: CloudUser,
  options?: { forceFull?: boolean }
) => {
  const { db } = ensureServices();
  const ledger = options?.forceFull ? createFullLedger(snapshot) : snapshot.meta.syncLedger;
  const hasChanges =
    ledger.dirtySettings ||
    Object.keys(ledger.dirtyClients).length > 0 ||
    Object.keys(ledger.dirtyProducts).length > 0 ||
    Object.keys(ledger.dirtyRoutes).length > 0 ||
    Object.keys(ledger.dirtyTasks).length > 0 ||
    Object.keys(ledger.dirtySavedViews).length > 0;

  if (!hasChanges) {
    return;
  }

  const metaRef = doc(db, 'panels', panelCloudConfig.panelId, 'meta', 'config');
  const batch = writeBatch(db);

  if (ledger.dirtySettings || Object.keys(ledger.dirtyRoutes).length > 0) {
    batch.set(
      metaRef,
      {
        history: snapshot.history,
        routes: snapshot.routes,
        routeSelections: snapshot.routeSelections,
        routeDates: snapshot.routeDates,
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
  }

  applyCollectionChanges(batch, db, ['panels', panelCloudConfig.panelId, 'clients'], snapshot.clients, ledger.dirtyClients);
  applyCollectionChanges(batch, db, ['panels', panelCloudConfig.panelId, 'products'], snapshot.products, ledger.dirtyProducts);
  applyCollectionChanges(batch, db, ['panels', panelCloudConfig.panelId, 'tasks'], snapshot.tasks, ledger.dirtyTasks);
  applyCollectionChanges(
    batch,
    db,
    ['panels', panelCloudConfig.panelId, 'savedViews'],
    snapshot.savedViews,
    ledger.dirtySavedViews
  );

  await batch.commit();
};
