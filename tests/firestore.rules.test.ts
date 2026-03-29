// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-painelclientesamg';

let testEnv: RulesTestEnvironment;

describe('firestore rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('allows only the owner to read their own admin document', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'panelAdmins', 'admin-1'), { role: 'owner' });
    });

    const adminDb = testEnv.authenticatedContext('admin-1').firestore();
    const otherDb = testEnv.authenticatedContext('other-user').firestore();

    await assertSucceeds(getDoc(doc(adminDb, 'panelAdmins', 'admin-1')));
    await assertFails(getDoc(doc(otherDb, 'panelAdmins', 'admin-1')));
  });

  it('allows panel access only to users present in panelAdmins', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'panelAdmins', 'admin-1'), { role: 'owner' });
      await setDoc(doc(context.firestore(), 'panels', 'painel-clientes-amg', 'meta', 'config'), {
        schemaVersion: 2
      });
    });

    const adminDb = testEnv.authenticatedContext('admin-1').firestore();
    const blockedDb = testEnv.authenticatedContext('blocked-user').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(adminDb, 'panels', 'painel-clientes-amg', 'meta', 'config')));
    await assertFails(getDoc(doc(blockedDb, 'panels', 'painel-clientes-amg', 'meta', 'config')));
    await assertFails(getDoc(doc(anonDb, 'panels', 'painel-clientes-amg', 'meta', 'config')));
  });
});
