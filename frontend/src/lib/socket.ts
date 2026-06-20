// ============================================================
// Socket.io Client Singleton & Hook
// ============================================================
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  RoomState,
  RoomJoinedResponse,
  RoomReconnectedResponse,
  GameStateData,
  GameEventData,
  ChatMessage,
  SocketError,
  CardData,
} from './types';

// Smart socket URL resolution:
// 1. Use NEXT_PUBLIC_SOCKET_URL env var if set (for production via .env.production)
// 2. In production (NODE_ENV === 'production'), default to Render backend
// 3. In development, fallback to localhost:3001
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? 'https://daifugou-backend.onrender.com'
    : 'http://localhost:3001');

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
    });
  }
  return globalSocket;
}

export function disconnectSocket(): void {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export interface UseSocketReturn {
  status: ConnectionStatus;
  room: RoomState | null;
  playerId: string | null;
  playerName: string | null;
  error: string | null;
  hand: CardData[];
  currentTurn: string | null;
  revolution: boolean;
  tableCards: CardData[] | null;
  lastPlayedBy: string | null;
  finishOrder: string[];
  roundNumber: number;
  myRank: string | null;
  miyakoOchi: boolean;
  gameEvent: GameEventData | null;
  chatMessages: ChatMessage[];
  createRoom: (playerName?: string, maxPlayers?: number) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  addBot: (roomId: string) => void;
  removeBot: (roomId: string, botId: string) => void;
  startGame: (roomId: string) => void;
  playCards: (roomId: string, cardIds: string[]) => void;
  passTurn: (roomId: string) => void;
  nextRound: (roomId: string) => void;
  sendChat: (roomId: string, message: string) => void;
  leaveRoom: () => void;
  reconnect: (playerId: string, roomId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hand, setHand] = useState<CardData[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [revolution, setRevolution] = useState(false);
  const [tableCards, setTableCards] = useState<CardData[] | null>(null);
  const [lastPlayedBy, setLastPlayedBy] = useState<string | null>(null);
  const [finishOrder, setFinishOrder] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [myRank, setMyRank] = useState<string | null>(null);
  const [miyakoOchi, setMiyakoOchi] = useState(false);
  const [gameEvent, setGameEvent] = useState<GameEventData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Connection timeout detection (3 seconds for Render wake-up)
    const timeoutId = setTimeout(() => {
      if (socket.connected) {
        setStatus('connected');
      } else {
        setStatus('connecting'); // Show loading overlay
      }
    }, 3000);

    const onConnect = () => {
      clearTimeout(timeoutId);
      setStatus('connected');
      setError(null);
    };

    const onDisconnect = () => {
      setStatus('connecting');
    };

    const onConnectError = (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
      setStatus('connecting');
    };


    const onRoomJoined = (data: RoomJoinedResponse) => {
      setRoom(data.room);
      setPlayerId(data.playerId);
      setPlayerName(data.playerName);
      // Store session for reconnection
      if (typeof window !== 'undefined') {
        localStorage.setItem('daifugou-playerId', data.playerId);
        localStorage.setItem('daifugou-roomId', data.roomId);
      }
    };

    const onRoomReconnected = (data: RoomReconnectedResponse) => {
      setRoom(data.room);
      setPlayerId(data.playerId);
      setPlayerName(data.playerName);
    };

    const onRoomUpdated = (roomState: RoomState) => {
      setRoom(roomState);
      if (roomState.revolution !== undefined) setRevolution(roomState.revolution);
      if (roomState.currentTurn !== undefined) setCurrentTurn(roomState.currentTurn);
      if (roomState.tableCards !== undefined) setTableCards(roomState.tableCards);
      if (roomState.lastPlayedBy !== undefined) setLastPlayedBy(roomState.lastPlayedBy);
      if (roomState.finishOrder !== undefined) setFinishOrder(roomState.finishOrder);
      if (roomState.roundNumber !== undefined) setRoundNumber(roomState.roundNumber);
    };

    const onGameState = (data: GameStateData) => {
      setHand(data.hand);
      setCurrentTurn(data.currentTurn);
      setRevolution(data.revolution);
      setTableCards(data.tableCards);
      setLastPlayedBy(data.lastPlayedBy);
      setFinishOrder(data.finishOrder);
      setRoundNumber(data.roundNumber);
      setMyRank(data.myRank);
      setMiyakoOchi(data.miyakoOchi);
    };

    const onGameEvent = (data: GameEventData) => {
      setGameEvent(data);
      // Auto-clear event after 3 seconds
      setTimeout(() => setGameEvent(null), 3000);
    };

    const onChat = (data: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-20), data]);
      // Auto-clear chat after 5 seconds
      setTimeout(() => {
        setChatMessages(prev => prev.filter(m => m !== data));
      }, 5000);
    };

    const onError = (err: SocketError) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:reconnected', onRoomReconnected);
    socket.on('room:updated', onRoomUpdated);
    socket.on('game:state', onGameState);
    socket.on('game:event', onGameEvent);
    socket.on('game:chat', onChat);
    socket.on('error', onError);

    // Auto-reconnect if we have stored session
    if (typeof window !== 'undefined') {
      const storedPlayerId = localStorage.getItem('daifugou-playerId');
      const storedRoomId = localStorage.getItem('daifugou-roomId');
      if (storedPlayerId && storedRoomId && socket.connected) {
        socket.emit('room:reconnect', {
          playerId: storedPlayerId,
          roomId: storedRoomId,
        });
      }
    }

    return () => {
      clearTimeout(timeoutId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:reconnected', onRoomReconnected);
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:state', onGameState);
      socket.off('game:event', onGameEvent);
      socket.off('game:chat', onChat);
      socket.off('error', onError);
    };
  }, []);

  const createRoom = useCallback((playerName?: string, maxPlayers?: number) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:create', { playerName, maxPlayers });
    }
  }, []);

  const joinRoom = useCallback((roomId: string, playerName?: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:join', { roomId: roomId.toUpperCase(), playerName });
    }
  }, []);

  const addBot = useCallback((roomId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:addBot', { roomId });
    }
  }, []);

  const removeBot = useCallback((roomId: string, botId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:removeBot', { roomId, botId });
    }
  }, []);

  const startGame = useCallback((roomId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('game:start', { roomId });
    }
  }, []);

  const playCards = useCallback((roomId: string, cardIds: string[]) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('game:play', { roomId, cardIds });
    }
  }, []);

  const passTurn = useCallback((roomId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('game:pass', { roomId });
    }
  }, []);

  const nextRound = useCallback((roomId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('game:nextRound', { roomId });
    }
  }, []);

  const sendChat = useCallback((roomId: string, message: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('game:chat', { roomId, message });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:leave');
    }
    setRoom(null);
    setPlayerId(null);
    setPlayerName(null);
    setHand([]);
    setCurrentTurn(null);
    setRevolution(false);
    setTableCards(null);
    setLastPlayedBy(null);
    setFinishOrder([]);
    setRoundNumber(1);
    setMyRank(null);
    setMiyakoOchi(false);
    setGameEvent(null);
    setChatMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('daifugou-playerId');
      localStorage.removeItem('daifugou-roomId');
    }
  }, []);

  const reconnect = useCallback((playerId: string, roomId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:reconnect', { playerId, roomId });
    }
  }, []);

  return {
    status,
    room,
    playerId,
    playerName,
    error,
    hand,
    currentTurn,
    revolution,
    tableCards,
    lastPlayedBy,
    finishOrder,
    roundNumber,
    myRank,
    miyakoOchi,
    gameEvent,
    chatMessages,
    createRoom,
    joinRoom,
    addBot,
    removeBot,
    startGame,
    playCards,
    passTurn,
    nextRound,
    sendChat,
    leaveRoom,
    reconnect,
  };
}
