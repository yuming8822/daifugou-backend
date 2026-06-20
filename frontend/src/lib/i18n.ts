// ============================================================
// Japanese / English Bilingual Dictionary
// ============================================================
import type { Language, I18nDict } from './types';

const dictionary: I18nDict = {
  // App Title
  'app.title': {
    ja: '大富豪',
    en: 'Daifugou',
  },
  'app.subtitle': {
    ja: 'オンライン対戦カードゲーム',
    en: 'Online Card Game',
  },

  // Lobby
  'lobby.nickname': {
    ja: 'ニックネーム',
    en: 'Nickname',
  },
  'lobby.nickname.placeholder': {
    ja: 'ランダム',
    en: 'Random',
  },
  'lobby.create': {
    ja: 'ルームを作成',
    en: 'Create Room',
  },
  'lobby.join': {
    ja: 'ルームに入室',
    en: 'Join Room',
  },
  'lobby.roomId': {
    ja: 'ルームID',
    en: 'Room ID',
  },
  'lobby.roomId.placeholder': {
    ja: '4桁のコードを入力',
    en: 'Enter 4-digit code',
  },
  'lobby.maxPlayers': {
    ja: '最大人数',
    en: 'Max Players',
  },

  // Room
  'room.waiting': {
    ja: '待機中',
    en: 'Waiting',
  },
  'room.playing': {
    ja: '対戦中',
    en: 'Playing',
  },
  'room.finished': {
    ja: '終了',
    en: 'Finished',
  },
  'room.players': {
    ja: 'プレイヤー',
    en: 'Players',
  },
  'room.host': {
    ja: 'ホスト',
    en: 'Host',
  },
  'room.you': {
    ja: 'あなた',
    en: 'You',
  },
  'room.bot': {
    ja: 'Bot',
    en: 'Bot',
  },
  'room.addBot': {
    ja: 'AIを追加',
    en: 'Add Bot',
  },
  'room.removeBot': {
    ja: '削除',
    en: 'Remove',
  },
  'room.startGame': {
    ja: 'ゲーム開始',
    en: 'Start Game',
  },
  'room.leave': {
    ja: '退出',
    en: 'Leave',
  },
  'room.copyId': {
    ja: 'ルームIDをコピー',
    en: 'Copy Room ID',
  },
  'room.copied': {
    ja: 'コピーしました！',
    en: 'Copied!',
  },
  'room.waitingForPlayers': {
    ja: 'プレイヤーの入室を待っています...',
    en: 'Waiting for players...',
  },
  'room.minPlayers': {
    ja: '最低2人必要です',
    en: 'Minimum 2 players required',
  },

  // Loading / Connection
  'loading.waking': {
    ja: 'サーバーを起動しています。30〜50秒ほどお待ちください...',
    en: 'Waking up the server, please wait 30-50 seconds...',
  },
  'loading.connecting': {
    ja: '接続中...',
    en: 'Connecting...',
  },
  'loading.connected': {
    ja: '接続完了！',
    en: 'Connected!',
  },
  'loading.error': {
    ja: '接続エラー',
    en: 'Connection Error',
  },
  'loading.retry': {
    ja: '再接続',
    en: 'Retry',
  },

  // Ranks (Daifugou specific)
  'rank.daifugou': {
    ja: '大富豪',
    en: 'Daifugou (Grand Millionaire)',
  },
  'rank.fugou': {
    ja: '富豪',
    en: 'Fugou (Millionaire)',
  },
  'rank.heimin': {
    ja: '平民',
    en: 'Heimin (Commoner)',
  },
  'rank.hinmin': {
    ja: '貧民',
    en: 'Hinmin (Poor)',
  },
  'rank.daihinmin': {
    ja: '大貧民',
    en: 'Daihinmin (Grand Poor)',
  },

  // Game Actions
  'game.pass': {
    ja: 'パス',
    en: 'Pass',
  },
  'game.play': {
    ja: '出す',
    en: 'Play',
  },
  'game.selectCards': {
    ja: 'カードを選択',
    en: 'Select Cards',
  },
  'game.yourTurn': {
    ja: 'あなたの番です',
    en: 'Your Turn',
  },
  'game.waiting': {
    ja: '他のプレイヤーの番です',
    en: 'Waiting for other players',
  },
  'game.dealing': {
    ja: '配牌中...',
    en: 'Dealing...',
  },
  'game.revolution': {
    ja: '革命！',
    en: 'Revolution!',
  },
  'game.eightGiri': {
    ja: '8切り！',
    en: '8-Giri!',
  },
  'game.miyakoOchi': {
    ja: '都落ち！',
    en: 'Miyako-Ochi!',
  },
  'game.winner': {
    ja: '勝者',
    en: 'Winner',
  },
  'game.waitingHost': {
    ja: 'ホストの開始を待っています...',
    en: 'Waiting for host to start...',
  },
  'game.needPlayers': {
    ja: '最低2人必要です',
    en: 'Need at least 2 players',
  },
  'game.handCount': {
    ja: '枚',
    en: ' cards',
  },
  'game.opponent': {
    ja: '対戦相手',
    en: 'Opponent',
  },
  'game.you': {
    ja: 'あなた',
    en: 'You',
  },
  'game.turn': {
    ja: 'の番',
    en: "'s turn",
  },
  'game.selected': {
    ja: '選択中',
    en: 'Selected',
  },
  'game.noCards': {
    ja: 'カードがありません',
    en: 'No cards',
  },
  'game.spectating': {
    ja: '観戦中',
    en: 'Spectating',
  },
  'game.rankTitle': {
    ja: '階級',
    en: 'Rank',
  },
  'game.waitingForDeal': {
    ja: '配牌を待っています...',
    en: 'Waiting for deal...',
  },
  'game.dealComplete': {
    ja: '配牌完了！',
    en: 'Deal complete!',
  },
  'game.roomCode': {
    ja: 'ルームコード',
    en: 'Room Code',
  },
  'game.players': {
    ja: 'プレイヤー',
    en: 'Players',
  },
  'game.bots': {
    ja: 'ボット',
    en: 'Bots',
  },
  'game.human': {
    ja: '人間',
    en: 'Human',
  },
  'game.ai': {
    ja: 'AI',
    en: 'AI',
  },
  'game.disconnected': {
    ja: '切断',
    en: 'Disconnected',
  },
  'game.reconnecting': {
    ja: '再接続中...',
    en: 'Reconnecting...',
  },
  'game.connected': {
    ja: '接続済み',
    en: 'Connected',
  },
  'game.waitingForPlayers': {
    ja: 'プレイヤーを待っています...',
    en: 'Waiting for players...',
  },
  'game.starting': {
    ja: '開始中...',
    en: 'Starting...',
  },
  'game.inProgress': {
    ja: '対戦中',
    en: 'In Progress',
  },
  'game.finished': {
    ja: '終了',
    en: 'Finished',
  },
  'game.gameEnd': {
    ja: 'ゲーム終了',
    en: 'Game Over',
  },
  'game.nextRound': {
    ja: '次のラウンド',
    en: 'Next Round',
  },
  'game.taxation': {
    ja: '納税',
    en: 'Taxation',
  },
  // Rules
  'rules.title': {
    ja: 'ルール',
    en: 'Rules',
  },
  'rules.basics': {
    ja: '基本ルール',
    en: 'Basic Rules',
  },
  'rules.basicsDesc': {
    ja: '大富豪は54枚のカード（ジョーカー2枚含む）を使用するゲームです。3が最も弱く、2が最も強く、ジョーカーは最強のカードです。単騎・ペア・スリーカード・フォーカード（ボム）を出すことができます。',
    en: 'Daifugou uses 54 cards (including 2 Jokers). 3 is the weakest, 2 is the strongest, and Joker is the strongest card. You can play singles, pairs, three-of-a-kind, and four-of-a-kind (bombs).',
  },
  'rules.revolution': {
    ja: '革命 (Revolution)',
    en: 'Revolution',
  },
  'rules.revolutionDesc': {
    ja: '4枚同じ数字のカード（ボム）を出すと発生。カードの強さが完全に逆転します（3が最強、2が最弱）。ジョーカーは依然として最強です。',
    en: 'Triggered by playing 4 cards of the same rank (bomb). Card strength is completely reversed (3 becomes strongest, 2 becomes weakest). Joker remains the strongest.',
  },
  'rules.eightGiri': {
    ja: '8切り (8-Giri)',
    en: '8-Giri',
  },
  'rules.eightGiriDesc': {
    ja: '数字の8を含むカードを出すと、場のカードが強制的にクリアされ、8を出したプレイヤーが自由に任意のカードを出せます。',
    en: 'Playing a card containing the number 8 clears the table. The player who played 8 can then play any cards freely.',
  },
  'rules.miyakoOchi': {
    ja: '都落ち (Miyako-Ochi)',
    en: 'Miyako-Ochi',
  },
  'rules.miyakoOchiDesc': {
    ja: '前回の大富豪が1位を取れなかった場合、強制的に大貧民に降格され、そのラウンドから脱落します。',
    en: 'If the previous Daifugou (Grand Millionaire) fails to get 1st place, they are forcibly demoted to Daihinmin (Grand Poor) and eliminated from the round.',
  },
  'rules.taxation': {
    ja: '納税 (Taxation)',
    en: 'Taxation',
  },
  'rules.taxationDesc': {
    ja: '次のラウンド開始前に、大富豪と大貧民、富豪と貧民の間で最強/最弱のカードが自動的に交換されます。',
    en: 'Before the next round, the strongest/weakest cards are automatically exchanged between Daifugou & Daihinmin, and Fugou & Hinmin.',
  },
  'rules.cardTypes': {
    ja: 'カードの組み合わせ',
    en: 'Card Combinations',
  },
  'rules.single': {
    ja: '単騎：1枚出し',
    en: 'Single: Play 1 card',
  },
  'rules.pair': {
    ja: 'ペア：同じ数字2枚',
    en: 'Pair: 2 cards of same rank',
  },
  'rules.triple': {
    ja: 'スリーカード：同じ数字3枚',
    en: 'Three of a Kind: 3 cards of same rank',
  },
  'rules.bomb': {
    ja: 'ボム：同じ数字4枚（革命発生）',
    en: 'Bomb: 4 cards of same rank (triggers Revolution)',
  },
  'rules.joker': {
    ja: 'ジョーカー：最強の単騎カード',
    en: 'Joker: Strongest single card',
  },
  'rules.close': {
    ja: '閉じる',
    en: 'Close',
  },


  'game.round': {
    ja: 'ラウンド',
    en: 'Round',
  },
  'game.score': {
    ja: 'スコア',
    en: 'Score',
  },
  'game.wins': {
    ja: '勝ち',
    en: 'Wins',
  },
  'game.losses': {
    ja: '負け',
    en: 'Losses',
  },
  'game.draw': {
    ja: '引き分け',
    en: 'Draw',
  },

  // Quick Chat
  'chat.nice': {
    ja: 'ナイス！',
    en: 'Nice!',
  },
  'chat.pass': {
    ja: 'パスします',
    en: 'Pass!',
  },
  'chat.boss': {
    ja: 'ボス来た！',
    en: 'Boss is coming!',
  },
  'chat.lucky': {
    ja: 'ラッキー！',
    en: 'Lucky!',
  },
  'chat.unlucky': {
    ja: 'アンラッキー...',
    en: 'Unlucky...',
  },
  'chat.gg': {
    ja: 'お疲れ様でした！',
    en: 'GG!',
  },

  // Boss Key
  'bosskey.title': {
    ja: 'Next.js App Router Documentation',
    en: 'Next.js App Router Documentation',
  },
  'bosskey.content': {
    ja: 'このページはNext.js App Routerの技術文書です。ルーティング、レンダリング、データフェッチングについて詳しく説明しています。',
    en: 'This page is technical documentation for Next.js App Router. It covers routing, rendering, and data fetching in detail.',
  },
};

export function t(key: string, lang: Language): string {
  return dictionary[key]?.[lang] ?? key;
}

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'ja';
  return (localStorage.getItem('daifugou-lang') as Language) || 'ja';
}

export function setLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('daifugou-lang', lang);
  }
}
