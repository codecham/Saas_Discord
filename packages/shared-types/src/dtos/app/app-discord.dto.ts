export interface GuildDTO {
	id: string;
	name?: string;
	icon?: string | null;
	ownerId?: string;
	memberCount?: number;
	joined_at?: Date;
}

/**
 * Membre d'une guild - DTO enrichi et optimisé
 * Transformé depuis DiscordGuildMemberDTO au backend
 * 
 * Changements vs DTO Discord:
 * - Structure aplatie (pas de nested user)
 * - URLs précomputées (avatarUrl, guildAvatarUrl)
 * - Champs computed (displayName, isAdmin, isOwner, etc.)
 * - Dates en string ISO (sérialisable)
 * - Permissions calculées
 */
export interface GuildMemberDTO {
  // ===== Identifiants =====
  id: string;                    // user.id
  guildId: string;               // Guild concernée
  
  // ===== Identité (flatten depuis user) =====
  username: string;              // user.username
  discriminator: string;         // user.discriminator (peut être "0")
  globalName?: string;           // user.global_name
  displayName: string;           // Computed: nick || globalName || username
  
  // ===== Avatars (URLs précomputées) =====
  avatar?: string;               // user.avatar (hash)
  avatarUrl: string;             // URL CDN complète (user avatar)
  guildAvatar?: string;          // Guild-specific avatar hash
  guildAvatarUrl?: string;       // URL CDN complète (guild avatar si existe)
  
  // ===== Flags utilisateur =====
  isBot: boolean;                // user.bot
  isSystem: boolean;             // user.system
  
  // ===== Informations guild =====
  nickname?: string;             // nick dans la guild
  roles: string[];               // IDs des rôles
  joinedAt: string;              // ISO date (joined_at)
  premiumSince?: string;         // ISO date (premium_since) - Boost
  
  // ===== Permissions & Status (computed) =====
  isOwner: boolean;              // Est le propriétaire du serveur
  isAdmin: boolean;              // A la permission ADMINISTRATOR
  isModerator: boolean;          // A des permissions de modération
  permissions?: string;          // Bitfield des permissions (optionnel)
  
  // ===== Modération =====
  isMuted: boolean;              // mute (vocal)
  isDeafened: boolean;           // deaf (vocal)
  isTimedOut: boolean;           // Computed: communication_disabled_until > now
  timeoutEndsAt?: string;        // ISO date (communication_disabled_until)
  
  // ===== Autres =====
  isPending: boolean;            // pending (membership screening)
  flags: number;                 // Guild member flags
}

// ============================================
// PAGINATION - Response avec métadonnées
// ============================================

/**
 * Response paginée pour la liste des membres
 * Permet de gérer efficacement les gros serveurs
 */
export interface MemberListResponseDTO {
  // ===== Données =====
  members: GuildMemberDTO[];
  
  // ===== Métadonnées de pagination =====
  total: number;                 // Nombre total de membres dans la guild
  page: number;                  // Page actuelle (si pagination par page)
  limit: number;                 // Nombre de membres par page
  hasMore: boolean;              // Y a-t-il d'autres membres à charger ?
  nextCursor?: string;           // Cursor pour la prochaine page (pagination cursor-based)
  
  // ===== Métadonnées supplémentaires =====
  loadedCount: number;           // Nombre de membres chargés dans cette réponse
  timestamp: string;             // ISO date - Quand les données ont été récupérées
}

// ============================================
// GUILD ROLE - DTO simplifié
// ============================================

/**
 * Rôle d'une guild - DTO enrichi
 * À compléter selon les besoins futurs
 */
export interface GuildRoleDTO {
  id: string;
  guildId: string;
  name: string;
  color: number;                 // Couleur en décimal
  colorHex: string;              // Computed: couleur en hex (#RRGGBB)
  position: number;
  permissions: string;           // Bitfield
  isManaged: boolean;            // managed (bot role, boost role)
  isMentionable: boolean;
  isHoisted: boolean;            // hoisted (affiché séparément)
  icon?: string;
  iconUrl?: string;
  
  // Computed
  isAdmin: boolean;
  isEveryone: boolean;           // @everyone role
  memberCount?: number;          // Optionnel: nombre de membres avec ce rôle
}

/**
 * Statistiques d'un membre (optionnel)
 * À charger séparément si besoin
 */
export interface MemberStatsDTO {
  memberId: string;
  guildId: string;
  
  // Stats messages
  totalMessages: number;
  messagesLast7Days: number;
  messagesLast30Days: number;
  
  // Stats vocal
  totalVoiceMinutes: number;
  voiceMinutesLast7Days: number;
  voiceMinutesLast30Days: number;
  
  // Stats réactions
  totalReactionsGiven: number;
  totalReactionsReceived: number;
  
  // Ranking
  messagesRank?: number;         // Classement messages
  voiceRank?: number;            // Classement vocal
  
  // Métadonnées
  firstSeenAt: string;           // ISO date
  lastActiveAt: string;          // ISO date
}
