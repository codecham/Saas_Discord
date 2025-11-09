/**
 * 📊 Types pour le composant StatCard
 */

/**
 * Couleurs disponibles pour les icônes et badges
 * Basées sur le thème PrimeNG + Tailwind
 */
export type StatCardColor = 
  | 'blue'
  | 'orange' 
  | 'cyan'
  | 'purple'
  | 'green'
  | 'red'
  | 'pink'
  | 'indigo';

/**
 * Tailles disponibles pour le StatCard
 */
export type StatCardSize = 'small' | 'medium' | 'large';

/**
 * Variants du composant
 */
export type StatCardVariant = 'default' | 'compact';

/**
 * Configuration de l'indicateur de trend (+X% depuis X)
 */
export interface StatCardTrend {
  /**
   * Valeur du trend (peut être positive ou négative)
   * @example 12 pour +12%
   * @example -5 pour -5%
   */
  value: number;

  /**
   * Label optionnel du trend
   * @example "depuis hier"
   * @example "vs mois dernier"
   */
  label?: string;

  /**
   * Inverser les couleurs (rouge = bon, vert = mauvais)
   * Utile pour des métriques où une baisse est positive (ex: taux d'erreur)
   * @default false
   */
  invertColors?: boolean;
}

/**
 * Configuration du subtitle avec highlight
 */
export interface StatCardSubtitle {
  /**
   * Partie mise en évidence (primary color)
   * @example "24 new"
   */
  highlight?: string;

  /**
   * Partie normale (muted color)
   * @example "since last visit"
   */
  text: string;
}