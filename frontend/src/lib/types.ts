// ============================================================
// Shared Type Definitions for Daifugou (大富豪)
// ============================================================

/** Player info exposed to clients (no hand cards revealed) */
export interface PlayerInfo {
  id: string;
  name: string;
  isBot: boolean;
  isConnected: boolean;
  seatIndex: number;
  handCount: number;
  finished?: boolean;
  rank?: string | null;
}

/** Room state exposed to clients */
export interface RoomState {
  id: string;
  players: PlayerInfo[];
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  revolution?: boolean;
  currentTurn?: string | null;
  tableCards?: CardData[] | null;
  lastPlayedBy?: string | null;
  finishOrder?: string[];
  roundNumber?: number;
}

/** Response when joining/creating a room */
export interface RoomJoinedResponse {
  roomId: string;
  playerId: string;
  playerName: string;
  room: RoomState;
}

/** Response when reconnecting */
export interface RoomReconnectedResponse {
  roomId: string;
  playerId: string;
  playerName: string;
  room: RoomState;
}

/** Card data sent from server */
export interface CardData {
  id: string;
  suit: 'spade' | 'heart' | 'diamond' | 'club';
  rank: string;
  isJoker: boolean;
}

/** Game state sent to each player privately */
export interface GameStateData {
  hand: CardData[];
  currentTurn: string | null;
  revolution: boolean;
  tableCards: CardData[] | null;
  lastPlayedBy: string | null;
  finishOrder: string[];
  roundNumber: number;
  myRank: string | null;
  miyakoOchi: boolean;
}

/** Game event broadcast to all players */
export interface GameEventData {
  type: 'eightGiri' | 'revolution' | 'miyakoOchi' | 'playerFinished' | 'gameEnd' | 'tableCleared' | 'newRound';
  playerId?: string;
  active?: boolean;
  finishOrder?: string[];
  roundNumber?: number;
  finishPosition?: number;
}

/** Quick chat message */
export interface ChatMessage {
  playerId: string;
  message: string;
}

/** Socket error event */
export interface SocketError {
  message: string;
}

/** Supported languages */
export type Language = 'ja' | 'en';

/** i18n dictionary type */
export type I18nDict = Record<string, Record<Language, string>>;
