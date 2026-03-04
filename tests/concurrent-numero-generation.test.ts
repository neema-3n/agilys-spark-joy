interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface TestResult {
  type: 'facture' | 'bon_commande';
  success: boolean;
  numero?: string;
  error?: string;
  duration: number;
}

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const TEST_EMAIL = process.env.TEST_AUTH_EMAIL ?? 'super@agilys.com';
const TEST_PASSWORD = process.env.TEST_AUTH_PASSWORD ?? 'Agilys2024!';
const TEST_EXERCICE_ID = process.env.TEST_EXERCICE_ID ?? 'd057ab7d-c1a2-4eea-9666-8137d700729e';
const NUM_CONCURRENT_REQUESTS = Number(process.env.NUM_CONCURRENT_REQUESTS ?? 10);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 20_000);

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const requestJson = async <T>(
  path: string,
  options: RequestInit,
  fallback: string
): Promise<T> => {
  const response = await withTimeout(
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
      }
    }),
    REQUEST_TIMEOUT_MS
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && typeof Reflect.get(payload, 'message') === 'string'
        ? String(Reflect.get(payload, 'message'))
        : fallback;
    throw new Error(message);
  }

  return payload as T;
};

const login = async (): Promise<TokenPair> => {
  return requestJson<TokenPair>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    },
    'Authentication failed'
  );
};

const fetchOneFournisseurId = async (token: string): Promise<string> => {
  const data = await requestJson<Array<{ id: string }>>(
    '/fournisseurs',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    'Impossible de récupérer les fournisseurs'
  );

  const firstId = data[0]?.id;
  if (!firstId) {
    throw new Error('Aucun fournisseur disponible pour exécuter le test');
  }

  return firstId;
};

const createFactureConcurrent = async (token: string, fournisseurId: string, index: number): Promise<TestResult> => {
  const startTime = Date.now();

  try {
    const data = await requestJson<{ numero: string }>(
      '/factures',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          exerciceId: TEST_EXERCICE_ID,
          fournisseurId,
          objet: `Test concurrent facture ${index}`,
          dateFacture: new Date().toISOString().slice(0, 10),
          montantHT: 1000,
          montantTVA: 200,
          montantTTC: 1200,
          montantLiquide: 0
        })
      },
      'Erreur création facture'
    );

    return {
      type: 'facture',
      success: true,
      numero: data.numero,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      type: 'facture',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    };
  }
};

const createBonCommandeConcurrent = async (token: string, fournisseurId: string, index: number): Promise<TestResult> => {
  const startTime = Date.now();

  try {
    const data = await requestJson<{ numero: string }>(
      '/bons-commande',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          exerciceId: TEST_EXERCICE_ID,
          fournisseurId,
          objet: `Test concurrent BC ${index}`,
          dateCommande: new Date().toISOString().slice(0, 10),
          montant: 5000
        })
      },
      'Erreur création bon de commande'
    );

    return {
      type: 'bon_commande',
      success: true,
      numero: data.numero,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      type: 'bon_commande',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    };
  }
};

const findDuplicates = (values: string[]): string[] => {
  return values.filter((value, index) => values.indexOf(value) !== index);
};

const analyzeResults = (results: TestResult[]) => {
  console.log('\n📊 RÉSULTATS DU TEST DE CHARGE\n');
  console.log('='.repeat(80));

  const factureResults = results.filter((result) => result.type === 'facture');
  const bcResults = results.filter((result) => result.type === 'bon_commande');

  console.log('\n💰 FACTURES:');
  console.log(`  ✓ Succès: ${factureResults.filter((result) => result.success).length}/${factureResults.length}`);
  console.log(`  ✗ Échecs: ${factureResults.filter((result) => !result.success).length}/${factureResults.length}`);

  const factureNumeros = factureResults.filter((result) => result.success && result.numero).map((result) => result.numero!);
  const factureDoublons = findDuplicates(factureNumeros);

  if (factureDoublons.length > 0) {
    console.log(`  ⚠️  DOUBLONS DÉTECTÉS: ${factureDoublons.join(', ')}`);
  } else {
    console.log('  ✓ Aucun doublon détecté');
  }

  console.log(`  📝 Numéros générés: ${factureNumeros.join(', ')}`);

  const factureAvgDuration = factureResults.reduce((sum, result) => sum + result.duration, 0) / factureResults.length;
  console.log(`  ⏱️  Temps moyen: ${factureAvgDuration.toFixed(2)}ms`);

  console.log('\n📦 BONS DE COMMANDE:');
  console.log(`  ✓ Succès: ${bcResults.filter((result) => result.success).length}/${bcResults.length}`);
  console.log(`  ✗ Échecs: ${bcResults.filter((result) => !result.success).length}/${bcResults.length}`);

  const bcNumeros = bcResults.filter((result) => result.success && result.numero).map((result) => result.numero!);
  const bcDoublons = findDuplicates(bcNumeros);

  if (bcDoublons.length > 0) {
    console.log(`  ⚠️  DOUBLONS DÉTECTÉS: ${bcDoublons.join(', ')}`);
  } else {
    console.log('  ✓ Aucun doublon détecté');
  }

  console.log(`  📝 Numéros générés: ${bcNumeros.join(', ')}`);

  const bcAvgDuration = bcResults.reduce((sum, result) => sum + result.duration, 0) / bcResults.length;
  console.log(`  ⏱️  Temps moyen: ${bcAvgDuration.toFixed(2)}ms`);

  const errors = results.filter((result) => !result.success);
  if (errors.length > 0) {
    console.log('\n❌ ERREURS:');
    errors.forEach((error) => {
      console.log(`  - [${error.type}] ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  const allSuccess = results.every((result) => result.success);
  const noDuplicates = factureDoublons.length === 0 && bcDoublons.length === 0;

  if (allSuccess && noDuplicates) {
    console.log('\n✅ TEST RÉUSSI - Génération concurrente sécurisée');
  } else {
    console.log('\n❌ TEST ÉCHOUÉ - Problèmes détectés');
    process.exitCode = 1;
  }
};

const runConcurrentTest = async () => {
  console.log('🚀 Démarrage du test de charge concurrente...\n');
  console.log(`   API_BASE_URL: ${API_BASE_URL}`);
  console.log(`   Utilisateurs simultanés: ${NUM_CONCURRENT_REQUESTS}`);
  console.log(`   Exercice ID: ${TEST_EXERCICE_ID}\n`);

  try {
    console.log('🔐 Authentification en cours...');
    const { accessToken } = await login();
    console.log('✓ Authentifié avec succès\n');

    const fournisseurId = await fetchOneFournisseurId(accessToken);
    console.log(`✓ Fournisseur de test sélectionné: ${fournisseurId}\n`);

    console.log('⚡ Lancement des requêtes concurrentes...');

    const facturePromises = Array.from({ length: NUM_CONCURRENT_REQUESTS }, (_, index) =>
      createFactureConcurrent(accessToken, fournisseurId, index + 1)
    );

    const bcPromises = Array.from({ length: NUM_CONCURRENT_REQUESTS }, (_, index) =>
      createBonCommandeConcurrent(accessToken, fournisseurId, index + 1)
    );

    const results = await Promise.all([...facturePromises, ...bcPromises]);
    analyzeResults(results);
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
};

void runConcurrentTest();
