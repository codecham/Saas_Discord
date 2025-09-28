export enum EventType {
	// Général
	Ready = 'Ready',
	Error = 'Error',
	Warn = 'Warn',
	Debug = 'Debug',

	// Messages
	MessageCreate = 'MessageCreate',
	MessageUpdate = 'MessageUpdate',
	MessageDelete = 'MessageDelete',
	MessageDeleteBulk = 'MessageDeleteBulk',

	// Réactions
	MessageReactionAdd = 'MessageReactionAdd',
	MessageReactionRemove = 'MessageReactionRemove',
	MessageReactionRemoveAll = 'MessageReactionRemoveAll',
	MessageReactionRemoveEmoji = 'MessageReactionRemoveEmoji',

	// Membres
	GuildMemberAdd = 'GuildMemberAdd',
	GuildMemberRemove = 'GuildMemberRemove',
	GuildMemberUpdate = 'GuildMemberUpdate',
	GuildBanAdd = 'GuildBanAdd',
	GuildBanRemove = 'GuildBanRemove',

	// Rôles
	RoleCreate = 'RoleCreate',
	RoleDelete = 'RoleDelete',
	RoleUpdate = 'RoleUpdate',

	// Salons (channels)
	ChannelCreate = 'ChannelCreate',
	ChannelDelete = 'ChannelDelete',
	ChannelUpdate = 'ChannelUpdate',
	ChannelPinsUpdate = 'ChannelPinsUpdate',

	// Guildes (serveurs)
	GuildCreate = 'GuildCreate',
	GuildDelete = 'GuildDelete',
	GuildUpdate = 'GuildUpdate',
	GuildList = 'GuildList',
	GuildSync = 'GuildSync',
	GuildUnavailable = 'GuildUnavailable',
	GuildIntegrationsUpdate = 'GuildIntegrationsUpdate',

	// Événements vocaux - Connexions/Déconnexions
	VoiceChannelJoin = 'VoiceChannelJoin',
	VoiceChannelLeave = 'VoiceChannelLeave',
	VoiceChannelMove = 'VoiceChannelMove',

	// Événements vocaux - Actions de modération
	VoiceMute = 'VoiceMute',
	VoiceUnmute = 'VoiceUnmute',
	VoiceDeafen = 'VoiceDeafen',
	VoiceUndeafen = 'VoiceUndeafen',

	// Événements vocaux - Actions utilisateur
	VoiceSelfMute = 'VoiceSelfMute',
	VoiceSelfDeafen = 'VoiceSelfDeafen',
	VoiceStreaming = 'VoiceStreaming',
	VoiceVideo = 'VoiceVideo',

	// Présence / statut
	PresenceUpdate = 'PresenceUpdate',
	UserUpdate = 'UserUpdate',
	TypingStart = 'TypingStart',

	// Invitations
	InviteCreate = 'InviteCreate',
	InviteDelete = 'InviteDelete',

	// Interactions (slash commands, boutons, etc.)
	InteractionCreate = 'InteractionCreate',

	// Emojis
	EmojiCreate = 'EmojiCreate',
	EmojiDelete = 'EmojiDelete',
	EmojiUpdate = 'EmojiUpdate',

	// Threads
	ThreadCreate = 'ThreadCreate',
	ThreadUpdate = 'ThreadUpdate',
	ThreadDelete = 'ThreadDelete',
	ThreadListSync = 'ThreadListSync',
	ThreadMemberUpdate = 'ThreadMemberUpdate',
	ThreadMembersUpdate = 'ThreadMembersUpdate',

	// Webhooks
	WebhooksUpdate = 'WebhooksUpdate',

	// AutoMod (si activé)
	AutoModerationActionExecution = 'AutoModerationActionExecution',
	AutoModerationRuleCreate = 'AutoModerationRuleCreate',
	AutoModerationRuleDelete = 'AutoModerationRuleDelete',
	AutoModerationRuleUpdate = 'AutoModerationRuleUpdate'
}