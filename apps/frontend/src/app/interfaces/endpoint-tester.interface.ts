export interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  requiresAuth: boolean;
  category: string;
  expectedResponse?: string; // Description du type de réponse attendu
}

export interface EndpointTestResult {
  endpoint: ApiEndpoint;
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  responseTime?: number;
  timestamp: Date;
}