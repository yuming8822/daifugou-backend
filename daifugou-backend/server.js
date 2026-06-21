const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// Configuration
// ============================================================
const PORT = process.env.PORT || 3001;

// CORS: allow all origins for development/deployment flexibility
// In production, set CORS_ORIGIN env var to restrict (comma-separated)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any origin (safe for Socket.io with credentials)
    callback(null, true);
  },
  credentials: true,
};

// ============================================================
// Express + Socket.io Setup
// ============================================================
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ============================================================
// In-Memory Data Store
// ============================================================
const rooms = new Map();
const playerSockets = new Map();
const disconnectedTimers = new Map();

// ============================================================
// Card & Game Logic
// ============================================================

const SUITS = ['spade', 'heart', 'diamond', 'club'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}_${rank}`, suit, rank, isJoker: false });
    }
  }
  deck.push({ id: 'joker_red', suit: 'heart', rank: '2', isJoker: true });
  deck.push({ id: 'joker_black', suit: 'spade', rank: '2', isJoker: true });
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Get numeric rank value (respects revolution) */
function getRankValue(rank, isJoker, revolution) {
  if (isJoker || rank === 'JOKER') return 100; // Joker always highest
  const order = revolution
    ? { '3': 13, '4': 12, '5': 11, '6': 10, '7': 9, '8': 8, '9': 7, '10': 6, 'J': 5, 'Q': 4, 'K': 3, 'A': 2, '2': 1 }
    : { '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12, '2': 13 };
  return order[rank] || 0;
}

/** Classify a set of cards into a play type */
function classifyPlay(cards) {
  if (!cards || cards.length === 0) return null;
  const n = cards.length;

  // Single
  if (n === 1) {
    return {
      type: 'single',
      rank: cards[0].isJoker ? 'JOKER' : cards[0].rank,
      isJoker: cards[0].isJoker,
      length: 1,
    };
  }

  // Check if all cards are Jokers
  const allJokers = cards.every(c => c.isJoker);
  if (allJokers) {
    // Multiple Jokers played together — treat as bomb-level play
    return { type: 'bomb', rank: 'JOKER', isJoker: true, length: n };
  }

  // Check if all same rank (non-Joker)
  const ranks = cards.map(c => c.rank);
  const allSameRank = ranks.every(r => r === ranks[0]);

  if (allSameRank) {
    if (n === 2) return { type: 'pair', rank: ranks[0], isJoker: false, length: 2 };
    if (n === 3) return { type: 'triple', rank: ranks[0], isJoker: false, length: 3 };
    if (n === 4) return { type: 'bomb', rank: ranks[0], isJoker: false, length: 4 };
  }

  return null; // Invalid combination
}

/** Check if a play beats the current table cards */
function canBeat(play, tablePlay, revolution) {
  if (!tablePlay) return true; // Free play

  // Bomb always beats non-bomb
  if (play.type === 'bomb' && tablePlay.type !== 'bomb') return true;
  if (tablePlay.type === 'bomb' && play.type !== 'bomb') return false;

  // Same type required
  if (play.type !== tablePlay.type) return false;
  if (play.length !== tablePlay.length) return false;

  // Compare rank values
  const playVal = getRankValue(play.rank, play.isJoker, revolution);
  const tableVal = getRankValue(tablePlay.rank, tablePlay.isJoker, revolution);
  return playVal > tableVal;
}

function dealCards(room) {
  const deck = shuffleDeck(createDeck());
  const playerCount = room.players.length;
  const cardsPerPlayer = Math.floor(deck.length / playerCount);

  room.players.forEach((player, index) => {
    const start = index * cardsPerPlayer;
    const end = index === playerCount - 1 ? deck.length : start + cardsPerPlayer;
    player.hand = deck.slice(start, end);
  });

  room.status = 'playing';
  room.revolution = false;
  room.tableCards = null;
  room.tablePlay = null;
  room.lastPlayedBy = null;
  room.passCount = 0;
  room.finishOrder = [];
  room.roundNumber = (room.roundNumber || 0) + 1;

  // First turn: player with 3 of spades
  const threeSpades = room.players.find(p => p.hand.some(c => c.id === 'spade_3'));
  room.currentTurn = threeSpades ? threeSpades.id : room.players[0].id;
}

/** Advance turn to next active player */
function advanceTurn(room) {
  const activePlayers = room.players.filter(p => !p.finished && !p.miyakoOchi);
  if (activePlayers.length === 0) return;

  const currentIdx = activePlayers.findIndex(p => p.id === room.currentTurn);
  const nextIdx = (currentIdx + 1) % activePlayers.length;
  room.currentTurn = activePlayers[nextIdx].id;
}

// ============================================================
// AI Bot Logic
// ============================================================

/** Find the best play for a bot player */
function findBotPlay(player, room) {
  const hand = player.hand;
  if (!hand || hand.length === 0) return null;

  const tablePlay = room.tablePlay;
  const revolution = room.revolution;

  // Helper: get all cards of a specific rank
  function getCardsByRank(rank) {
    return hand.filter(c => !c.isJoker && c.rank === rank);
  }

  // Helper: get all jokers
  function getJokers() {
    return hand.filter(c => c.isJoker);
  }

  // Priority 1: If we have an 8, play it (8-Giri strategy)
  // 8-Giri can ALWAYS be played regardless of table state
  const eights = getCardsByRank('8');
  if (eights.length >= 1) {
    // Play single 8 (always allowed — 8-Giri ignores table)
    return { cardIds: [eights[0].id], play: { type: 'single', rank: '8', isJoker: false, length: 1 } };
  }

  // Priority 2: If we have 4 of a kind, play bomb (Revolution)
  const rankCounts = {};
  hand.forEach(c => {
    if (!c.isJoker) {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    }
  });
  for (const [rank, count] of Object.entries(rankCounts)) {
    if (count >= 4) {
      const cards = getCardsByRank(rank);
      if (!tablePlay || canBeat({ type: 'bomb', rank, isJoker: false, length: 4 }, tablePlay, revolution)) {
        return { cardIds: cards.slice(0, 4).map(c => c.id), play: { type: 'bomb', rank, isJoker: false, length: 4 } };
      }
    }
  }

  // Priority 3: Try to play the lowest possible card that beats the table
  const sortedHand = [...hand].sort((a, b) => {
    const aVal = getRankValue(a.rank, a.isJoker, revolution);
    const bVal = getRankValue(b.rank, b.isJoker, revolution);
    return aVal - bVal;
  });

  if (!tablePlay) {
    // Free play: play the lowest single card (or pair/triple if available)
    // Try single
    return { cardIds: [sortedHand[0].id], play: { type: 'single', rank: sortedHand[0].rank, isJoker: sortedHand[0].isJoker, length: 1 } };
  }

  // Try to beat with same type
  if (tablePlay.type === 'single') {
    for (const card of sortedHand) {
      const play = { type: 'single', rank: card.rank, isJoker: card.isJoker, length: 1 };
      if (canBeat(play, tablePlay, revolution)) {
        return { cardIds: [card.id], play };
      }
    }
  } else if (tablePlay.type === 'pair') {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 2) {
        const cards = getCardsByRank(rank);
        const play = { type: 'pair', rank, isJoker: false, length: 2 };
        if (canBeat(play, tablePlay, revolution)) {
          return { cardIds: cards.slice(0, 2).map(c => c.id), play };
        }
      }
    }
  } else if (tablePlay.type === 'triple') {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 3) {
        const cards = getCardsByRank(rank);
        const play = { type: 'triple', rank, isJoker: false, length: 3 };
        if (canBeat(play, tablePlay, revolution)) {
          return { cardIds: cards.slice(0, 3).map(c => c.id), play };
        }
      }
    }
  } else if (tablePlay.type === 'bomb') {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 4) {
        const cards = getCardsByRank(rank);
        const play = { type: 'bomb', rank, isJoker: false, length: 4 };
        if (canBeat(play, tablePlay, revolution)) {
          return { cardIds: cards.slice(0, 4).map(c => c.id), play };
        }
      }
    }
  }

  // No playable cards found
  return null;
}

/** Execute a bot's turn */
function executeBotTurn(room, player) {
  const result = findBotPlay(player, room);

  if (result) {
    // Bot plays cards
    const { cardIds, play } = result;

    // Find the actual card objects before removing them
    const playedCards = [];
    for (const id of cardIds) {
      const card = player.hand.find(h => h.id === id);
      if (card) playedCards.push(card);
    }

    // Remove cards from hand
    playedCards.forEach(c => {
      player.hand = player.hand.filter(h => h.id !== c.id);
    });

    room.tableCards = playedCards;
    room.tablePlay = play;
    room.lastPlayedBy = player.id;
    room.passCount = 0;

    // Check for 8-Giri
    let eightGiri = false;
    if (play.rank === '8') {
      eightGiri = true;
      room.tableCards = null;
      room.tablePlay = null;
      room.lastPlayedBy = player.id;
      room.passCount = 0;
    }

    // Check for Revolution
    let revolutionTriggered = false;
    if (play.type === 'bomb') {
      room.revolution = !room.revolution;
      revolutionTriggered = true;
    }

    // Check if bot finished
    let playerFinished = false;
    if (player.hand.length === 0) {
      player.finished = true;
      room.finishOrder.push(player.id);
      playerFinished = true;

      // Check Miyako-Ochi
      const miyakoTarget = checkMiyakoOchi(room);
      if (miyakoTarget) {
        io.to(room.id).emit('game:event', { type: 'miyakoOchi', playerId: miyakoTarget });
      }
    }

    // Check game end
    const gameEnded = checkGameEnd(room);

    if (gameEnded) {
      assignRanksAndTax(room);
      room.status = 'finished';
      room.players.forEach(p => { p.prevRank = p.rank; });
      broadcastGameState(room);
      io.to(room.id).emit('room:updated', getRoomState(room));
      io.to(room.id).emit('game:event', { type: 'gameEnd', finishOrder: room.finishOrder });
      console.log(`[Bot:GameEnd] roomId=${room.id} order=${room.finishOrder.join(',')}`);
      return;
    }

    // Advance turn (8-Giri: same player goes again)
    if (!eightGiri) {
      advanceTurn(room);
    }

    // Broadcast events
    if (eightGiri) {
      io.to(room.id).emit('game:event', { type: 'eightGiri', playerId: player.id });
    }
    if (revolutionTriggered) {
      io.to(room.id).emit('game:event', { type: 'revolution', active: room.revolution });
    }
    if (playerFinished) {
      io.to(room.id).emit('game:event', { type: 'playerFinished', playerId: player.id, finishPosition: room.finishOrder.length });
    }

    broadcastGameState(room);
    io.to(room.id).emit('room:updated', getRoomState(room));
    console.log(`[Bot:Play] roomId=${room.id} player=${player.name} type=${play.type} rank=${play.rank}`);
  } else {
    // Bot passes
    room.passCount++;

    const activePlayers = room.players.filter(p => !p.finished && !p.miyakoOchi);
    if (room.passCount >= activePlayers.length - 1 && room.lastPlayedBy) {
      room.tableCards = null;
      room.tablePlay = null;
      room.passCount = 0;
      room.currentTurn = room.lastPlayedBy;
      io.to(room.id).emit('game:event', { type: 'tableCleared', playerId: room.lastPlayedBy });
    } else {
      advanceTurn(room);
    }

    broadcastGameState(room);
    io.to(room.id).emit('room:updated', getRoomState(room));
    console.log(`[Bot:Pass] roomId=${room.id} player=${player.name}`);
  }

  // After bot plays, check if next player is also a bot
  triggerNextBot(room);
}

/** Check if current turn player is a bot and trigger its play */
function triggerNextBot(room) {
  if (room.status !== 'playing') return;

  const currentPlayer = room.players.find(p => p.id === room.currentTurn);
  if (!currentPlayer || !currentPlayer.isBot) return;
  if (currentPlayer.finished || currentPlayer.miyakoOchi) return;

  // Add thinking delay (1-2 seconds)
  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    // Re-check state after delay (room might have changed)
    if (room.status !== 'playing') return;
    const player = room.players.find(p => p.id === room.currentTurn);
    if (!player || !player.isBot) return;
    if (player.finished || player.miyakoOchi) return;
    executeBotTurn(room, player);
  }, delay);
}

/** Check if game is over (only 1 player left or all but 1 finished) */
function checkGameEnd(room) {
  const activePlayers = room.players.filter(p => !p.finished && !p.miyakoOchi);
  if (activePlayers.length <= 1) {
    // Last remaining player finishes
    if (activePlayers.length === 1) {
      activePlayers[0].finished = true;
      room.finishOrder.push(activePlayers[0].id);
    }
    return true;
  }
  return false;
}

/** Assign ranks and perform taxation */
function assignRanksAndTax(room) {
  const order = room.finishOrder;
  const playerCount = room.players.length;

  // Assign ranks based on finish order
  const rankNames = ['daifugou', 'fugou', 'heimin', 'hinmin', 'daihinmin'];
  order.forEach((pid, idx) => {
    const player = room.players.find(p => p.id === pid);
    if (player) {
      player.rank = rankNames[idx] || 'heimin';
    }
  });

  // Unfinished players get lower ranks
  room.players.forEach(p => {
    if (!p.finished && !p.rank) {
      p.rank = 'daihinmin';
    }
  });

  // Taxation: swap cards between ranks
  if (playerCount >= 3) {
    const daifugou = room.players.find(p => p.rank === 'daifugou');
    const daihinmin = room.players.find(p => p.rank === 'daihinmin');
    const fugou = room.players.find(p => p.rank === 'fugou');
    const hinmin = room.players.find(p => p.rank === 'hinmin');

    if (daifugou && daihinmin) {
      // Daihinmin gives 2 strongest cards to Daifugou
      const sortedDaihinmin = [...daihinmin.hand].sort((a, b) =>
        getRankValue(b.rank, b.isJoker, false) - getRankValue(a.rank, a.isJoker, false)
      );
      const giveCards = sortedDaihinmin.slice(0, 2);
      giveCards.forEach(c => {
        daihinmin.hand = daihinmin.hand.filter(h => h.id !== c.id);
        daifugou.hand.push(c);
      });

      // Daifugou gives 2 weakest cards to Daihinmin
      const sortedDaifugou = [...daifugou.hand].sort((a, b) =>
        getRankValue(a.rank, a.isJoker, false) - getRankValue(b.rank, b.isJoker, false)
      );
      const giveBack = sortedDaifugou.slice(0, 2);
      giveBack.forEach(c => {
        daifugou.hand = daifugou.hand.filter(h => h.id !== c.id);
        daihinmin.hand.push(c);
      });
    }

    if (fugou && hinmin) {
      // Hinmin gives 1 strongest to Fugou
      const sortedHinmin = [...hinmin.hand].sort((a, b) =>
        getRankValue(b.rank, b.isJoker, false) - getRankValue(a.rank, a.isJoker, false)
      );
      const giveCard = sortedHinmin[0];
      if (giveCard) {
        hinmin.hand = hinmin.hand.filter(h => h.id !== giveCard.id);
        fugou.hand.push(giveCard);
      }

      // Fugou gives 1 weakest to Hinmin
      const sortedFugou = [...fugou.hand].sort((a, b) =>
        getRankValue(a.rank, a.isJoker, false) - getRankValue(b.rank, b.isJoker, false)
      );
      const giveBack = sortedFugou[0];
      if (giveBack) {
        fugou.hand = fugou.hand.filter(h => h.id !== giveBack.id);
        hinmin.hand.push(giveBack);
      }
    }
  }
}

/** Handle Miyako-Ochi: if previous Daifugou didn't finish first */
function checkMiyakoOchi(room) {
  const firstFinisher = room.finishOrder[0];
  if (!firstFinisher) return null;

  // Find the player who was Daifugou in the previous round
  const prevDaifugou = room.players.find(p => p.prevRank === 'daifugou');
  if (prevDaifugou && prevDaifugou.id !== firstFinisher && !prevDaifugou.finished) {
    prevDaifugou.miyakoOchi = true;
    prevDaifugou.hand = [];
    prevDaifugou.rank = 'daihinmin';
    return prevDaifugou.id;
  }
  return null;
}

// ============================================================
// Helper Functions
// ============================================================
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(id)) return generateRoomId();
  return id;
}

function generatePlayerName() {
  const adjectives = ['Swift', 'Silent', 'Brave', 'Clever', 'Mighty', 'Shadow', 'Neon', 'Pixel', 'Cyber', 'Lunar'];
  const nouns = ['Fox', 'Wolf', 'Tiger', 'Hawk', 'Panda', 'Dragon', 'Phoenix', 'Knight', 'Samurai', 'Ninja'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

function getRoomState(room) {
  if (!room) return null;
  return {
    id: room.id,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      isConnected: p.isConnected,
      seatIndex: p.seatIndex,
      handCount: p.hand ? p.hand.length : 0,
      finished: !!p.finished,
      rank: p.rank || null,
    })),
    hostId: room.hostId,
    status: room.status,
    maxPlayers: room.maxPlayers,
    revolution: room.revolution || false,
    currentTurn: room.currentTurn || null,
    tableCards: room.tableCards || null,
    lastPlayedBy: room.lastPlayedBy || null,
    finishOrder: room.finishOrder || [],
    roundNumber: room.roundNumber || 1,
  };
}

function emitGameState(room, socketId) {
  // Send private hand to specific player
  const player = room.players.find(p => {
    const entry = [...playerSockets.entries()].find(([sid, data]) => data.playerId === p.id && sid === socketId);
    return !!entry;
  });
  if (player) {
    io.to(socketId).emit('game:state', {
      hand: player.hand,
      currentTurn: room.currentTurn,
      revolution: room.revolution,
      tableCards: room.tableCards,
      lastPlayedBy: room.lastPlayedBy,
      finishOrder: room.finishOrder,
      roundNumber: room.roundNumber,
      myRank: player.rank || null,
      miyakoOchi: !!player.miyakoOchi,
    });
  }
}

function broadcastGameState(room) {
  // Send private hand to each player
  room.players.forEach(player => {
    const socketEntry = [...playerSockets.entries()].find(
      ([sid, data]) => data.playerId === player.id
    );
    if (socketEntry) {
      const [sid] = socketEntry;
      io.to(sid).emit('game:state', {
        hand: player.hand,
        currentTurn: room.currentTurn,
        revolution: room.revolution,
        tableCards: room.tableCards,
        lastPlayedBy: room.lastPlayedBy,
        finishOrder: room.finishOrder,
        roundNumber: room.roundNumber,
        myRank: player.rank || null,
        miyakoOchi: !!player.miyakoOchi,
      });
    }
  });
}

// ============================================================
// REST Endpoints
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, players: playerSockets.size });
});

// ============================================================
// Socket.io Event Handlers
// ============================================================
io.on('connection', (socket) => {
  console.log(`[Connect] socket=${socket.id}`);

  // ---------- Create Room ----------
  socket.on('room:create', ({ playerName, maxPlayers = 4 } = {}) => {
    try {
      const roomId = generateRoomId();
      const playerId = uuidv4();
      const name = playerName || generatePlayerName();

      const player = {
        id: playerId,
        name,
        isBot: false,
        isConnected: true,
        hand: [],
        seatIndex: 0,
        finished: false,
        miyakoOchi: false,
        rank: null,
        prevRank: null,
      };

      const room = {
        id: roomId,
        players: [player],
        hostId: playerId,
        status: 'waiting',
        maxPlayers: Math.min(Math.max(2, maxPlayers), 4),
        revolution: false,
        currentTurn: null,
        tableCards: null,
        tablePlay: null,
        lastPlayedBy: null,
        passCount: 0,
        finishOrder: [],
        roundNumber: 0,
      };

      rooms.set(roomId, room);
      playerSockets.set(socket.id, { playerId, roomId });

      socket.join(roomId);
      socket.emit('room:joined', {
        roomId,
        playerId,
        playerName: name,
        room: getRoomState(room),
      });

      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Room:Create] roomId=${roomId} host=${name}(${playerId})`);
    } catch (err) {
      console.error('[Room:Create Error]', err);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // ---------- Join Room ----------
  socket.on('room:join', ({ roomId, playerName } = {}) => {
    try {
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      const playerId = uuidv4();
      const name = playerName || generatePlayerName();

      const takenSeats = new Set(room.players.map(p => p.seatIndex));
      let seatIndex = 0;
      for (let i = 0; i < 4; i++) {
        if (!takenSeats.has(i)) {
          seatIndex = i;
          break;
        }
      }

      const player = {
        id: playerId,
        name,
        isBot: false,
        isConnected: true,
        hand: [],
        seatIndex,
        finished: false,
        miyakoOchi: false,
        rank: null,
        prevRank: null,
      };

      room.players.push(player);
      playerSockets.set(socket.id, { playerId, roomId });

      socket.join(roomId);
      socket.emit('room:joined', {
        roomId: room.id,
        playerId,
        playerName: name,
        room: getRoomState(room),
      });

      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Room:Join] roomId=${roomId} player=${name}(${playerId}) seat=${seatIndex}`);
    } catch (err) {
      console.error('[Room:Join Error]', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ---------- Add Bot ----------
  socket.on('room:addBot', ({ roomId } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      const socketData = playerSockets.get(socket.id);
      if (!socketData || socketData.playerId !== room.hostId) { socket.emit('error', { message: 'Only the host can add bots' }); return; }
      if (room.status !== 'waiting') { socket.emit('error', { message: 'Game already in progress' }); return; }
      if (room.players.length >= room.maxPlayers) { socket.emit('error', { message: 'Room is full' }); return; }

      const takenSeats = new Set(room.players.map(p => p.seatIndex));
      let seatIndex = 0;
      for (let i = 0; i < 4; i++) { if (!takenSeats.has(i)) { seatIndex = i; break; } }

      const botId = uuidv4();
      const botNames = ['AI Alpha', 'AI Beta', 'AI Gamma', 'AI Delta', 'AI Epsilon'];
      const botName = botNames[room.players.length - 1] || `Bot ${room.players.length + 1}`;

      const bot = {
        id: botId,
        name: botName,
        isBot: true,
        isConnected: true,
        hand: [],
        seatIndex,
        finished: false,
        miyakoOchi: false,
        rank: null,
        prevRank: null,
      };

      room.players.push(bot);
      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Room:AddBot] roomId=${roomId} bot=${botName}(${botId})`);
    } catch (err) {
      console.error('[Room:AddBot Error]', err);
      socket.emit('error', { message: 'Failed to add bot' });
    }
  });

  // ---------- Remove Bot ----------
  socket.on('room:removeBot', ({ roomId, botId } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      const socketData = playerSockets.get(socket.id);
      if (!socketData || socketData.playerId !== room.hostId) { socket.emit('error', { message: 'Only the host can remove bots' }); return; }
      const botIndex = room.players.findIndex(p => p.id === botId && p.isBot);
      if (botIndex === -1) { socket.emit('error', { message: 'Bot not found' }); return; }
      room.players.splice(botIndex, 1);
      io.to(roomId).emit('room:updated', getRoomState(room));
    } catch (err) {
      console.error('[Room:RemoveBot Error]', err);
      socket.emit('error', { message: 'Failed to remove bot' });
    }
  });

  // ---------- Start Game ----------
  socket.on('game:start', ({ roomId } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      const socketData = playerSockets.get(socket.id);
      if (!socketData || socketData.playerId !== room.hostId) { socket.emit('error', { message: 'Only the host can start the game' }); return; }
      if (room.status !== 'waiting') { socket.emit('error', { message: 'Game already started' }); return; }
      if (room.players.length < 2) { socket.emit('error', { message: 'Need at least 2 players' }); return; }

      // Reset player states
      room.players.forEach(p => {
        p.finished = false;
        p.miyakoOchi = false;
        p.rank = null;
      });

      dealCards(room);
      broadcastGameState(room);
      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Game:Start] roomId=${roomId} players=${room.players.length}`);

      // Trigger bot if first turn is a bot
      setTimeout(() => triggerNextBot(room), 500);
    } catch (err) {
      console.error('[Game:Start Error]', err);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // ---------- Play Cards ----------
  socket.on('game:play', ({ roomId, cardIds } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      if (room.status !== 'playing') { socket.emit('error', { message: 'Game not in progress' }); return; }

      const socketData = playerSockets.get(socket.id);
      if (!socketData) { socket.emit('error', { message: 'Not in room' }); return; }

      const player = room.players.find(p => p.id === socketData.playerId);
      if (!player) { socket.emit('error', { message: 'Player not found' }); return; }
      if (player.finished || player.miyakoOchi) { socket.emit('error', { message: 'You have already finished' }); return; }
      if (player.id !== room.currentTurn) { socket.emit('error', { message: 'Not your turn' }); return; }

      if (!cardIds || cardIds.length === 0) { socket.emit('error', { message: 'No cards selected' }); return; }

      // Find cards in player's hand
      const playedCards = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean);
      if (playedCards.length !== cardIds.length) { socket.emit('error', { message: 'Invalid cards' }); return; }

      // Classify the play
      const play = classifyPlay(playedCards);
      if (!play) { socket.emit('error', { message: 'Invalid card combination' }); return; }

      // Check for 8-Giri FIRST — 8 can always be played regardless of table state
      let eightGiri = false;
      if (play.rank === '8') {
        eightGiri = true;
        // Remove cards from hand
        playedCards.forEach(c => {
          player.hand = player.hand.filter(h => h.id !== c.id);
        });
        // Clear table — 8-Giri wipes the board
        room.tableCards = null;
        room.tablePlay = null;
        room.lastPlayedBy = player.id;
        room.passCount = 0;
      } else {
        // Non-8 play: normal validation flow
        // Check if can beat current table
        if (!canBeat(play, room.tablePlay, room.revolution)) {
          socket.emit('error', { message: 'Cannot beat current cards' });
          return;
        }

        // Remove cards from hand
        playedCards.forEach(c => {
          player.hand = player.hand.filter(h => h.id !== c.id);
        });

        // Update table state
        room.tableCards = playedCards;
        room.tablePlay = play;
        room.lastPlayedBy = player.id;
        room.passCount = 0;
      }

      // Check for Revolution (4 of a kind)
      let revolutionTriggered = false;
      if (play.type === 'bomb') {
        room.revolution = !room.revolution;
        revolutionTriggered = true;
      }

      // Check if player finished
      let playerFinished = false;
      if (player.hand.length === 0) {
        player.finished = true;
        room.finishOrder.push(player.id);
        playerFinished = true;

        // Check Miyako-Ochi
        const miyakoTarget = checkMiyakoOchi(room);
        if (miyakoTarget) {
          io.to(roomId).emit('game:event', { type: 'miyakoOchi', playerId: miyakoTarget });
        }
      }

      // Check game end
      const gameEnded = checkGameEnd(room);

      if (gameEnded) {
        assignRanksAndTax(room);
        room.status = 'finished';
        // Store previous ranks for next round
        room.players.forEach(p => { p.prevRank = p.rank; });
        broadcastGameState(room);
        io.to(roomId).emit('room:updated', getRoomState(room));
        io.to(roomId).emit('game:event', { type: 'gameEnd', finishOrder: room.finishOrder });
        console.log(`[Game:End] roomId=${roomId} order=${room.finishOrder.join(',')}`);
        return;
      }

      // Advance turn (8-Giri: same player goes again)
      if (!eightGiri) {
        advanceTurn(room);
      }

      // Broadcast events
      if (eightGiri) {
        io.to(roomId).emit('game:event', { type: 'eightGiri', playerId: player.id });
      }
      if (revolutionTriggered) {
        io.to(roomId).emit('game:event', { type: 'revolution', active: room.revolution });
      }
      if (playerFinished) {
        io.to(roomId).emit('game:event', { type: 'playerFinished', playerId: player.id, finishPosition: room.finishOrder.length });
      }

      broadcastGameState(room);
      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Game:Play] roomId=${roomId} player=${player.name} type=${play.type} rank=${play.rank}`);

      // Trigger bot if next turn is a bot
      setTimeout(() => triggerNextBot(room), 300);
    } catch (err) {
      console.error('[Game:Play Error]', err);
      socket.emit('error', { message: 'Failed to play cards' });
    }
  });

  // ---------- Pass ----------
  socket.on('game:pass', ({ roomId } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      if (room.status !== 'playing') { socket.emit('error', { message: 'Game not in progress' }); return; }

      const socketData = playerSockets.get(socket.id);
      if (!socketData) { socket.emit('error', { message: 'Not in room' }); return; }

      const player = room.players.find(p => p.id === socketData.playerId);
      if (!player) { socket.emit('error', { message: 'Player not found' }); return; }
      if (player.finished || player.miyakoOchi) { socket.emit('error', { message: 'You have already finished' }); return; }
      if (player.id !== room.currentTurn) { socket.emit('error', { message: 'Not your turn' }); return; }

      room.passCount++;

      // Check if 3 consecutive passes (clear table)
      const activePlayers = room.players.filter(p => !p.finished && !p.miyakoOchi);
      if (room.passCount >= activePlayers.length - 1 && room.lastPlayedBy) {
        // All other players passed - clear table
        room.tableCards = null;
        room.tablePlay = null;
        room.passCount = 0;
        room.currentTurn = room.lastPlayedBy; // Last player gets free play
        io.to(roomId).emit('game:event', { type: 'tableCleared', playerId: room.lastPlayedBy });
      } else {
        advanceTurn(room);
      }

      broadcastGameState(room);
      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Game:Pass] roomId=${roomId} player=${player.name}`);

      // Trigger bot if next turn is a bot
      setTimeout(() => triggerNextBot(room), 300);
    } catch (err) {
      console.error('[Game:Pass Error]', err);
      socket.emit('error', { message: 'Failed to pass' });
    }
  });

  // ---------- Next Round (Host only) ----------
  socket.on('game:nextRound', ({ roomId } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      const socketData = playerSockets.get(socket.id);
      if (!socketData || socketData.playerId !== room.hostId) { socket.emit('error', { message: 'Only the host can start next round' }); return; }
      if (room.status !== 'finished') { socket.emit('error', { message: 'Game not finished' }); return; }

      // Reset for new round
      room.players.forEach(p => {
        p.finished = false;
        p.miyakoOchi = false;
        p.hand = [];
      });
      room.finishOrder = [];
      room.tableCards = null;
      room.tablePlay = null;
      room.lastPlayedBy = null;
      room.passCount = 0;

      dealCards(room);

      // Perform taxation
      assignRanksAndTax(room);

      // Store ranks for next round's Miyako-Ochi check
      room.players.forEach(p => { p.prevRank = p.rank; });

      broadcastGameState(room);
      io.to(roomId).emit('room:updated', getRoomState(room));
      io.to(roomId).emit('game:event', { type: 'newRound', roundNumber: room.roundNumber });
      console.log(`[Game:NextRound] roomId=${roomId} round=${room.roundNumber}`);
    } catch (err) {
      console.error('[Game:NextRound Error]', err);
      socket.emit('error', { message: 'Failed to start next round' });
    }
  });

  // ---------- Quick Chat ----------
  socket.on('game:chat', ({ roomId, message } = {}) => {
    try {
      const socketData = playerSockets.get(socket.id);
      if (!socketData) return;
      const room = rooms.get(roomId);
      if (!room) return;
      io.to(roomId).emit('game:chat', { playerId: socketData.playerId, message });
    } catch (err) {
      console.error('[Game:Chat Error]', err);
    }
  });

  // ---------- Leave Room ----------
  socket.on('room:leave', () => {
    handleDisconnect(socket);
  });

  // ---------- Reconnect ----------
  socket.on('room:reconnect', ({ playerId, roomId } = {}) => {
    try {
      const room = rooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room no longer exists' }); return; }

      const player = room.players.find(p => p.id === playerId);
      if (!player) { socket.emit('error', { message: 'Player not found in room' }); return; }

      if (disconnectedTimers.has(playerId)) {
        clearTimeout(disconnectedTimers.get(playerId));
        disconnectedTimers.delete(playerId);
      }

      player.isConnected = true;
      playerSockets.set(socket.id, { playerId, roomId });

      for (const [sid, data] of playerSockets.entries()) {
        if (data.playerId === playerId && sid !== socket.id) {
          playerSockets.delete(sid);
        }
      }

      socket.join(roomId);
      socket.emit('room:reconnected', {
        roomId: room.id,
        playerId,
        playerName: player.name,
        room: getRoomState(room),
      });

      // If game is in progress, send current game state
      if (room.status === 'playing' || room.status === 'finished') {
        io.to(socket.id).emit('game:state', {
          hand: player.hand,
          currentTurn: room.currentTurn,
          revolution: room.revolution,
          tableCards: room.tableCards,
          lastPlayedBy: room.lastPlayedBy,
          finishOrder: room.finishOrder,
          roundNumber: room.roundNumber,
          myRank: player.rank || null,
          miyakoOchi: !!player.miyakoOchi,
        });
      }

      io.to(roomId).emit('room:updated', getRoomState(room));
      console.log(`[Room:Reconnect] roomId=${roomId} player=${player.name}(${playerId})`);
    } catch (err) {
      console.error('[Room:Reconnect Error]', err);
      socket.emit('error', { message: 'Failed to reconnect' });
    }
  });

  // ---------- Boss Key (broadcast to room) ----------
  socket.on('bosskey:toggle', (data) => {
    const socketData = playerSockets.get(socket.id);
    if (!socketData) return;
    const { roomId } = socketData;
    if (roomId) {
      socket.to(roomId).emit('bosskey:toggled', { active: data.active });
    }
  });

  // ---------- Disconnect ----------
  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });

  function handleDisconnect(socket) {
    const socketData = playerSockets.get(socket.id);
    if (!socketData) return;

    const { playerId, roomId } = socketData;
    const room = rooms.get(roomId);
    if (!room) {
      playerSockets.delete(socket.id);
      return;
    }

    // Don't remove bots
    const player = room.players.find(p => p.id === playerId);
    if (player && player.isBot) return;

    playerSockets.delete(socket.id);
    socket.leave(roomId);

    if (player) {
      player.isConnected = false;

      // If game is in progress, keep player for 30 seconds
      if (room.status === 'playing') {
        const timer = setTimeout(() => {
          // Remove player from room after timeout
          const idx = room.players.findIndex(p => p.id === playerId);
          if (idx !== -1) {
            room.players.splice(idx, 1);
            disconnectedTimers.delete(playerId);
            io.to(roomId).emit('room:updated', getRoomState(room));

            // Check if room is empty
            if (room.players.length === 0) {
              rooms.delete(roomId);
              console.log(`[Room:Delete] roomId=${roomId} (empty)`);
            }
          }
        }, 30000);
        disconnectedTimers.set(playerId, timer);
      } else {
        // Remove player immediately if not playing
        const idx = room.players.findIndex(p => p.id === playerId);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          io.to(roomId).emit('room:updated', getRoomState(room));

          if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`[Room:Delete] roomId=${roomId} (empty)`);
          }
        }
      }
    }

    console.log(`[Disconnect] socket=${socket.id} player=${playerId} room=${roomId}`);
  }
});

// ============================================================
// Start Server
// ============================================================
server.listen(PORT, () => {
  console.log(`[Daifugou Server] Running on port ${PORT}`);
  console.log(`[Daifugou Server] CORS: allowing all origins`);
});
