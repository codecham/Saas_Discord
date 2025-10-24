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


// ============================================
// GUILD CHANNEL - DTO enrichi
// ============================================

/**
 * Permission overwrite enrichie avec informations supplémentaires
 */
export interface ChannelPermissionOverwriteDTO {
  id: string;                    // Role ID ou User ID
  type: number;                  // 0 = Role, 1 = Member
  allow: string;                 // Bitfield des permissions autorisées
  deny: string;                  // Bitfield des permissions refusées
  
  // Computed (enrichi au backend)
  targetName?: string;           // Nom du role/membre
  targetType: 'role' | 'member'; // Type lisible
}

/**
 * Channel d'une guild - DTO enrichi et optimisé
 * Transformé depuis DiscordChannelDTO au backend
 * 
 * Changements vs DTO Discord:
 * - Catégorisation (isText, isVoice, isCategory, etc.)
 * - Permissions enrichies avec noms
 * - URLs précomputées
 * - Champs computed (categoryPath, isLocked, hasActiveThreads, etc.)
 */
export interface GuildChannelDTO {
  // ===== Identifiants =====
  id: string;
  guildId: string;
  
  // ===== Informations de base =====
  name: string;
  type: number;                  // DiscordChannelType enum
  position: number;
  
  // ===== Hiérarchie =====
  parentId?: string;             // ID de la catégorie parente
  parentName?: string;           // Nom de la catégorie (computed)
  categoryPath?: string;         // Chemin complet ex: "Général / canaux-textuels"
  
  // ===== Permissions =====
  permissionOverwrites: ChannelPermissionOverwriteDTO[];
  
  // ===== Propriétés Text Channels =====
  topic?: string;                // Description du channel
  nsfw: boolean;                 // Channel NSFW
  rateLimitPerUser?: number;     // Slowmode en secondes
  lastMessageId?: string;
  lastPinTimestamp?: string;     // ISO date
  
  // ===== Propriétés Voice Channels =====
  bitrate?: number;              // Qualité audio (bps)
  userLimit?: number;            // Limite d'utilisateurs (0 = illimité)
  rtcRegion?: string;            // Région voice
  videoQualityMode?: number;     // 1 = auto, 2 = 720p
  
  // ===== Propriétés Forum Channels =====
  defaultAutoArchiveDuration?: number;
  defaultReactionEmoji?: string;
  defaultSortOrder?: number;
  defaultForumLayout?: number;
  
  // ===== Propriétés Thread Channels =====
  threadMetadata?: {
    archived: boolean;
    autoArchiveDuration: number;
    archiveTimestamp?: string;
    locked: boolean;
    invitable?: boolean;
  };
  messageCount?: number;
  memberCount?: number;
  totalMessageSent?: number;
  
  // ===== Flags =====
  flags?: number;
  
  // ===== Computed - Catégorisation =====
  isText: boolean;               // Text, Announcement, Forum
  isVoice: boolean;              // Voice, Stage
  isCategory: boolean;
  isThread: boolean;             // Public, Private, Announcement Thread
  isForum: boolean;
  isAnnouncement: boolean;
  isStage: boolean;
  
  // ===== Computed - États =====
  isLocked: boolean;             // Channel verrouillé (permissions)
  isPrivate: boolean;            // @everyone ne peut pas voir
  hasSlowmode: boolean;          // rateLimitPerUser > 0
  hasActiveThreads?: boolean;    // Pour les channels de texte
  
  // ===== Computed - Stats (optionnel) =====
  activeThreadCount?: number;
  archivedThreadCount?: number;
  
  // ===== Métadonnées =====
  createdAt?: string;            // ISO date (snowflake decode)
}

/**
 * Response pour la liste des channels
 */
export interface ChannelListResponseDTO {
  channels: GuildChannelDTO[];
  
  // Métadonnées
  total: number;
  categories: number;
  textChannels: number;
  voiceChannels: number;
  threads: number;
  
  timestamp: string;             // ISO date - Quand les données ont été récupérées
}
