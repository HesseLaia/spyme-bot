// 游戏状态与核心规则逻辑（与 Telegram 解耦）
/**
 * @typedef {Object} Player
 * @property {number} userId
 * @property {string} name
 * @property {"civilian"|"spy"|"blank"|null} role
 * @property {string|null} word
 * @property {boolean} isAlive
 */

/**
 * @typedef {Object} Game
 * @property {number} chatId
 * @property {string} chatTitle
 * @property {"waiting"|"describing"|"voting"|"ended"} status
 * @property {number} hostId
 * @property {string} hostName
 * @property {Player[]} players
 * @property {string|null} civilianWord
 * @property {string|null} spyWord
 * @property {number} round
 * @property {Record<number, Record<number, number>>} votes
 * @property {number|null} lobbyMsgId
 * @property {number} describeIndex
 * @property {number|null} describeMsgId
 * @property {boolean} [voteResolved]
 * @property {NodeJS.Timeout|null} [voteTimeout]
 */

const { getRandomPair } = require("./word-pairs");

/**
 * @returns {Game}
 */
function createGame(chatId, chatTitle, hostId, hostName) {
  return {
    chatId,
    chatTitle,
    status: "waiting",
    hostId,
    hostName,
    players: [
      { userId: hostId, name: hostName, role: null, word: null, isAlive: true },
    ],
    civilianWord: null,
    spyWord: null,
    round: 1,
    votes: {},
    lobbyMsgId: null,
    describeIndex: 0,
    describeMsgId: null,
  };
}

function getSpyCount(playerCount) {
  return playerCount >= 9 ? 2 : 1;
}

function hasBlankRole(playerCount) {
  return playerCount >= 7;
}

/**
 * @param {Game} game
 */
function assignRoles(game) {
  const n = game.players.length;
  const spyCount = getSpyCount(n);
  const hasBlank = hasBlankRole(n);
  const pair = getRandomPair();

  game.civilianWord = pair.civilianWord;
  game.spyWord = pair.spyWord;

  const roles = Array(n).fill("civilian");
  const idx = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < spyCount; i++) roles[idx[i]] = "spy";
  if (hasBlank) roles[idx[spyCount]] = "blank";

  game.players.forEach((p, i) => {
    const role = roles[i];
    p.role = role;
    if (role === "civilian") {
      p.word = pair.civilianWord;
    } else if (role === "spy") {
      p.word = pair.spyWord;
    } else {
      p.word = "???";
    }
    p.isAlive = true;
  });
}

/**
 * @param {Game} game
 * @returns {Player[]}
 */
function getAlive(game) {
  return game.players.filter((p) => p.isAlive);
}

/**
 * @param {Game} game
 * @returns {"civilian"|"spy"|"blank"|null}
 */
function checkWin(game) {
  const alive = getAlive(game);
  const spies = alive.filter((p) => p.role === "spy");
  const civs = alive.filter((p) => p.role === "civilian");
  const blanks = alive.filter((p) => p.role === "blank");

  if (spies.length === 0 && blanks.length === 0) return "civilian";
  if (blanks.length > 0 && alive.length <= 2 && spies.length === 0) return "blank";
  if (civs.length <= spies.length) return "spy";
  return null;
}

module.exports = {
  createGame,
  getSpyCount,
  hasBlankRole,
  assignRoles,
  getAlive,
  checkWin,
};

