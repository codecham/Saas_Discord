export interface GatewayConfig {
  url: string;
  reconnectInterval: number;
  heartbeatInterval: number;
}

// export interface BotConfig {
//   id: string;
//   name: string;
//   token: string;
// }

export interface ConnectedBot {
  id: string;
  name: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}