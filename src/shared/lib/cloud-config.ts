import { PANEL_ID } from '@/shared/lib/constants';

export const firebaseConfig = {
  apiKey: 'AIzaSyCixIjP1Ch9wuc2z96IQjGCA4PK3JPUveM',
  authDomain: 'painelclientesamg.firebaseapp.com',
  projectId: 'painelclientesamg',
  storageBucket: 'painelclientesamg.firebasestorage.app',
  messagingSenderId: '393496619335',
  appId: '1:393496619335:web:1b5900b54df4ae89704462'
};

export const panelCloudConfig = {
  enabled: true,
  panelId: PANEL_ID,
  authMode: 'email-password',
  useEmulators: false,
  autoUploadLocalDataOnFirstLogin: true
} as const;

export const isFirebaseConfigured = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

export const cloudServicesReady = () => panelCloudConfig.enabled && isFirebaseConfigured();
