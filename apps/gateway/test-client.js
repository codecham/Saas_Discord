const { io } = require('socket.io-client');

// Connexion au namespace /bots de la Gateway
const socket = io('http://localhost:3001/bots');

console.log('🔄 Tentative de connexion à la Gateway...');

socket.on('connect', () => {
  console.log('✅ Connecté à la Gateway!');
  console.log('Socket ID:', socket.id);
  
  // Test 1: Enregistrer un bot fictif
  console.log('\n📝 Test 1: Enregistrement du bot...');
  socket.emit('bot:register', {
    botId: 'test-bot-001',
    botName: 'Bot de Test'
  });
});

socket.on('bot:registered', (data) => {
  console.log('✅ Bot enregistré:', data);
  
  // Test 2: Envoyer un heartbeat
  console.log('\n💓 Test 2: Heartbeat...');
  socket.emit('bot:heartbeat', {
    botId: 'test-bot-001'
  });
});

socket.on('bot:heartbeat_ack', (data) => {
  console.log('✅ Heartbeat ACK reçu:', data);
  
  // Test 3: Simuler un événement Discord
  console.log('\n📨 Test 3: Événement Discord...');
  socket.emit('discord:event', {
    botId: 'test-bot-001',
    eventType: 'messageCreate',
    eventData: {
      guildId: '123456789',
      channelId: '987654321',
      content: 'Hello from test!'
    }
  });
});

socket.on('discord:event_ack', (data) => {
  console.log('✅ Événement Discord ACK:', data);
  
  // Test 4: Message simple
  console.log('\n💬 Test 4: Message du bot...');
  socket.emit('bot:message', {
    botId: 'test-bot-001',
    message: 'Test message from bot'
  });
  
  console.log('\n🎉 Tous les tests terminés!');
  
  // Fermer la connexion après 2 secondes
  setTimeout(() => {
    console.log('🔌 Fermeture de la connexion...');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Déconnecté de la Gateway');
});

socket.on('connect_error', (error) => {
  console.error('❌ Erreur de connexion:', error.message);
  process.exit(1);
});

// Événements globaux (notifications)
socket.on('bot:connected', (data) => {
  console.log('📢 Notification: Nouveau bot connecté:', data);
});

console.log('⏳ En attente de la connexion...');
