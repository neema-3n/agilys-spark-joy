import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gvpsfgzstiqbjlgqglyh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cHNmZ3pzdGlxYmpsZ3FnbHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjQ4NjEsImV4cCI6MjA3NjM0MDg2MX0._-3-RCHJ1eXo_A1tbo6bgM-akZgnY74SxtWbz3gbJDM";

// Configuration du test
const NUM_CONCURRENT_REQUESTS = 10;
const TEST_CLIENT_ID = 'client-1';
const TEST_EXERCICE_ID = 'd057ab7d-c1a2-4eea-9666-8137d700729e'; // À adapter selon votre base

interface TestResult {
  type: 'facture' | 'bon_commande';
  success: boolean;
  numero?: string;
  error?: string;
  duration: number;
}

async function loginAsTestUser() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Connexion avec un utilisateur de test (à adapter selon vos credentials)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'super@agilys.com',
    password: 'Agilys2024!', // À sécuriser
  });

  if (error) throw new Error(`Authentication failed: ${error.message}`);
  
  return supabase;
}

async function createFactureConcurrent(
  supabase: ReturnType<typeof createClient>,
  index: number
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('create-facture', {
      body: {
        exerciceId: TEST_EXERCICE_ID,
        clientId: TEST_CLIENT_ID,
        fournisseurId: '550e8400-e29b-41d4-a716-446655440001', // UUID fictif
        objet: `Test concurrent facture ${index}`,
        dateFacture: new Date().toISOString().split('T')[0],
        montantHT: 1000,
        montantTVA: 200,
        montantTTC: 1200,
      },
    });

    if (error) throw error;

    return {
      type: 'facture',
      success: true,
      numero: data.numero,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      type: 'facture',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

async function createBonCommandeConcurrent(
  supabase: ReturnType<typeof createClient>,
  index: number
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('create-bon-commande', {
      body: {
        exerciceId: TEST_EXERCICE_ID,
        clientId: TEST_CLIENT_ID,
        fournisseurId: '550e8400-e29b-41d4-a716-446655440001', // UUID fictif
        objet: `Test concurrent BC ${index}`,
        dateCommande: new Date().toISOString().split('T')[0],
        montant: 5000,
      },
    });

    if (error) throw error;

    return {
      type: 'bon_commande',
      success: true,
      numero: data.numero,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      type: 'bon_commande',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

function analyzeResults(results: TestResult[]) {
  console.log('\n📊 RÉSULTATS DU TEST DE CHARGE\n');
  console.log('='.repeat(80));
  
  const factureResults = results.filter(r => r.type === 'facture');
  const bcResults = results.filter(r => r.type === 'bon_commande');
  
  // Analyse des factures
  console.log('\n💰 FACTURES:');
  console.log(`  ✓ Succès: ${factureResults.filter(r => r.success).length}/${factureResults.length}`);
  console.log(`  ✗ Échecs: ${factureResults.filter(r => !r.success).length}/${factureResults.length}`);
  
  const factureNumeros = factureResults
    .filter(r => r.success && r.numero)
    .map(r => r.numero!);
  
  const factureDoublons = factureNumeros.filter(
    (num, index) => factureNumeros.indexOf(num) !== index
  );
  
  if (factureDoublons.length > 0) {
    console.log(`  ⚠️  DOUBLONS DÉTECTÉS: ${factureDoublons.join(', ')}`);
  } else {
    console.log(`  ✓ Aucun doublon détecté`);
  }
  
  console.log(`  📝 Numéros générés: ${factureNumeros.join(', ')}`);
  
  const factureAvgDuration = factureResults.reduce((sum, r) => sum + r.duration, 0) / factureResults.length;
  console.log(`  ⏱️  Temps moyen: ${factureAvgDuration.toFixed(2)}ms`);
  
  // Analyse des bons de commande
  console.log('\n📦 BONS DE COMMANDE:');
  console.log(`  ✓ Succès: ${bcResults.filter(r => r.success).length}/${bcResults.length}`);
  console.log(`  ✗ Échecs: ${bcResults.filter(r => !r.success).length}/${bcResults.length}`);
  
  const bcNumeros = bcResults
    .filter(r => r.success && r.numero)
    .map(r => r.numero!);
  
  const bcDoublons = bcNumeros.filter(
    (num, index) => bcNumeros.indexOf(num) !== index
  );
  
  if (bcDoublons.length > 0) {
    console.log(`  ⚠️  DOUBLONS DÉTECTÉS: ${bcDoublons.join(', ')}`);
  } else {
    console.log(`  ✓ Aucun doublon détecté`);
  }
  
  console.log(`  📝 Numéros générés: ${bcNumeros.join(', ')}`);
  
  const bcAvgDuration = bcResults.reduce((sum, r) => sum + r.duration, 0) / bcResults.length;
  console.log(`  ⏱️  Temps moyen: ${bcAvgDuration.toFixed(2)}ms`);
  
  // Erreurs
  const errors = results.filter(r => !r.success);
  if (errors.length > 0) {
    console.log('\n❌ ERREURS:');
    errors.forEach(err => {
      console.log(`  - [${err.type}] ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Verdict final
  const allSuccess = results.every(r => r.success);
  const noDoublons = factureDoublons.length === 0 && bcDoublons.length === 0;
  
  if (allSuccess && noDoublons) {
    console.log('\n✅ TEST RÉUSSI - Génération concurrente sécurisée');
  } else {
    console.log('\n❌ TEST ÉCHOUÉ - Problèmes détectés');
  }
}

async function runConcurrentTest() {
  console.log('🚀 Démarrage du test de charge concurrente...\n');
  console.log(`   Utilisateurs simultanés: ${NUM_CONCURRENT_REQUESTS}`);
  console.log(`   Client ID: ${TEST_CLIENT_ID}`);
  console.log(`   Exercice ID: ${TEST_EXERCICE_ID}\n`);
  
  try {
    // Authentification
    console.log('🔐 Authentification en cours...');
    const supabase = await loginAsTestUser();
    console.log('✓ Authentifié avec succès\n');
    
    // Lancer les tests concurrents
    console.log('⚡ Lancement des requêtes concurrentes...');
    
    const facturePromises = Array.from({ length: NUM_CONCURRENT_REQUESTS }, (_, i) =>
      createFactureConcurrent(supabase, i + 1)
    );
    
    const bcPromises = Array.from({ length: NUM_CONCURRENT_REQUESTS }, (_, i) =>
      createBonCommandeConcurrent(supabase, i + 1)
    );
    
    const results = await Promise.all([...facturePromises, ...bcPromises]);
    
    // Analyser les résultats
    analyzeResults(results);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
runConcurrentTest();
