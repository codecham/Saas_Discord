/**
 * Représente un bucket de rate limiting Discord
 */
export interface RateLimitBucket {
  /**
   * Nombre de requêtes restantes dans le bucket
   */
  remaining: number;

  /**
   * Limite totale de requêtes pour ce bucket
   */
  limit: number;

  /**
   * Timestamp (en ms) quand le bucket sera réinitialisé
   */
  resetAt: number;

  /**
   * Durée (en secondes) après laquelle le bucket sera réinitialisé
   */
  resetAfter: number;

  /**
   * Hash du bucket Discord (utilisé pour identifier les buckets partagés)
   */
  bucket?: string;

  /**
   * Indique si c'est un rate limit global
   */
  global?: boolean;
}

/**
 * Options pour une requête à l'API Discord
 */
export interface DiscordApiRequestOptions {
  /**
   * Corps de la requête (pour POST, PATCH, PUT)
   */
  data?: any;

  /**
   * Headers supplémentaires à ajouter
   */
  headers?: Record<string, string>;

  /**
   * Clé unique pour identifier le bucket de rate limiting
   * Format recommandé: "resource:id:action"
   * Exemple: "guild:123456789:channels"
   */
  rateLimitKey?: string;

  /**
   * Paramètres de query string
   */
  params?: Record<string, any>;

  /**
   * Timeout de la requête en ms (par défaut: 15000)
   */
  timeout?: number;

  /**
   * Nombre de tentatives en cas d'erreur (par défaut: 3)
   */
  retries?: number;

  /**
   * Indique si on doit utiliser le token du bot ou non
   * Par défaut: true
   */
  useAuth?: boolean;

  /**
   * Token personnalisé à utiliser (override le token du bot)
   */
  customToken?: string;
}

/**
 * Réponse de l'API Discord avec métadonnées
 */
export interface DiscordApiResponse<T> {
  /**
   * Données de la réponse
   */
  data: T;

  /**
   * Informations de rate limiting
   */
  rateLimit?: RateLimitBucket;

  /**
   * Headers de la réponse
   */
  headers?: Record<string, string>;

  /**
   * Code de statut HTTP
   */
  status: number;
}
