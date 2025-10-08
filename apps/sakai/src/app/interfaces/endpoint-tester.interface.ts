// Interface pour définir un paramètre d'endpoint
export interface EndpointParameter {
  name: string; // Nom du paramètre (ex: "guildId")
  type: 'path' | 'query' | 'body'; // Type de paramètre
  description: string; // Description pour l'utilisateur
  required: boolean; // Est-ce obligatoire ?
  defaultValue?: string; // Valeur par défaut
  options?: string[]; // Liste d'options prédéfinies (pour select)
  placeholder?: string; // Placeholder pour l'input
  // Source automatique (ex: récupérer depuis un service)
  autoSource?: 'selectedGuild' | 'currentUserId' | 'firstChannel';
}

// Interface pour un endpoint
export interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string; // Peut contenir des placeholders comme {guildId}
  requiresAuth: boolean;
  category: string;
  expectedResponse?: string;
  note?: string; // Note supplémentaire
  parameters?: EndpointParameter[]; // Paramètres de l'endpoint
  bodyExample?: any; // Exemple de body pour POST/PUT/PATCH
}

// Interface pour le résultat d'un test
export interface EndpointTestResult {
  endpoint: ApiEndpoint;
  success: boolean;
  status: number;
  statusText?: string;
  data?: any;
  error?: string;
  errorDetails?: any; // Détails complets de l'erreur
  responseTime: number;
  timestamp: Date;
  headers?: Record<string, string>; // Headers de la réponse
  requestUrl?: string; // URL finale utilisée
  requestBody?: any; // Body envoyé (pour POST/PUT/PATCH)
}

// Interface pour les valeurs de paramètres saisies
export interface ParameterValues {
  [parameterName: string]: string;
}