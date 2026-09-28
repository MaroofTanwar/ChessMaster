import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const GAME_PAGE_SIZE = 10;

export const gameDateMillis = (value) => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const playerQuery = (uid, field, cursor) => {
  const clauses = [where(field, '==', uid), orderBy('endedAt', 'desc'), limit(GAME_PAGE_SIZE)];
  if (cursor) clauses.splice(2, 0, startAfter(cursor));
  return query(collection(db, 'games'), ...clauses);
};

export async function getCompletedGamesPage(uid, cursors = {}) {
  if (!db || !uid) return { games: [], cursors, hasMore: false };
  const requests = [];
  if (!cursors.whiteDone) requests.push(getDocs(playerQuery(uid, 'whitePlayerUid', cursors.white)).then((snapshot) => ['white', snapshot]));
  if (!cursors.blackDone) requests.push(getDocs(playerQuery(uid, 'blackPlayerUid', cursors.black)).then((snapshot) => ['black', snapshot]));
  const results = await Promise.all(requests);
  const next = { ...cursors };
  const merged = new Map();
  for (const [color, snapshot] of results) {
    const documents = snapshot.docs;
    next[color] = documents.at(-1) || next[color] || null;
    next[`${color}Done`] = documents.length < GAME_PAGE_SIZE;
    for (const item of documents) {
      const data = item.data();
      if (data.status === 'finished' || data.status === 'completed') merged.set(item.id, { id: item.id, ...data });
    }
  }
  return {
    games: [...merged.values()].sort((a, b) => gameDateMillis(b.endedAt) - gameDateMillis(a.endedAt)),
    cursors: next,
    hasMore: !next.whiteDone || !next.blackDone,
  };
}

export async function getGameById(gameId, uid) {
  if (!db || !gameId || !uid) return null;
  const snapshot = await getDoc(doc(db, 'games', gameId));
  if (!snapshot.exists()) return null;
  const game = { id: snapshot.id, ...snapshot.data() };
  if (game.whitePlayerUid !== uid && game.blackPlayerUid !== uid) return null;
  return game;
}

export async function getAllCompletedGames(uid) {
  let cursors = {};
  let hasMore = true;
  const games = new Map();
  while (hasMore) {
    const page = await getCompletedGamesPage(uid, cursors);
    for (const game of page.games) games.set(game.id, game);
    cursors = page.cursors;
    hasMore = page.hasMore;
  }
  return [...games.values()].sort((a, b) => gameDateMillis(b.endedAt) - gameDateMillis(a.endedAt));
}
