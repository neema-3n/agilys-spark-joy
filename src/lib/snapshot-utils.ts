import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate un montant en nombre avec séparateurs de milliers, SANS devise
 * IMPORTANT : Ne jamais afficher de symbole de devise (€, $, XAF, FCFA, etc.)
 * 
 * @param montant - Le montant à formater
 * @returns Le montant formaté SANS symbole de devise
 * 
 * @example
 * formatMontant(1234567.89) // "1 234 568"
 */
export const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
};

/**
 * Formate une date au format court français (dd/MM/yyyy)
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '-';
  }
};

/**
 * Formate une date et heure au format français (dd/MM/yyyy à HH:mm)
 */
export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return '-';
  }
};

/**
 * Génère l'URL d'une entité selon son type
 */
export const getEntityUrl = (type: string, id: string): string => {
  const entityRoutes: Record<string, string> = {
    'fournisseur': '/app/fournisseurs',
    'projet': '/app/projets',
    'engagement': '/app/engagements',
    'facture': '/app/factures',
    'bon-commande': '/app/bons-commande',
    'reservation': '/app/reservations',
    'ligne-budgetaire': '/app/budgets',
  };

  const basePath = entityRoutes[type] || '/app';
  return `${basePath}/${id}`;
};
