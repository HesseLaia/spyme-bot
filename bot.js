const { Bot, InlineKeyboard } = require("grammy");
// ═══════════════════════════════════════
// DATABASE LAYER — 粘贴到 bot.js 顶部
// const { Bot, InlineKeyboard } = require("grammy"); 下面
// ═══════════════════════════════════════

const mysql = require("mysql2/promise");

let db;

async function initDB() {
  db = await mysql.createPool({
    host: process.env.DB_HOST || "mysql.railway.internal",
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || "railway",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // 建表（如果不存在）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      chat_id BIGINT PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Database connected");
}

// 替换原来的 games Map
// 注意：所有写入数据库的 game 对象都应先在调用处 JSON.stringify，
// 以避免被隐式转成 "[object Object]"。
const gameRepo = {
  async get(chatId) {
    const [rows] = await db.execute(
      "SELECT data FROM games WHERE chat_id = ?",
      [chatId]
    );
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].data);
  },

  /**
   * @param {number} chatId
   * @param {string} gameJson 已通过 JSON.stringify 序列化的 game 字符串
   */
  async set(chatId, gameJson) {
    await db.execute(
      `INSERT INTO games (chat_id, data) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [chatId, gameJson]
    );
  },

  async delete(chatId) {
    await db.execute("DELETE FROM games WHERE chat_id = ?", [chatId]);
  },
};
const { BOT_TOKEN, BOT_USERNAME, BLINK_URL } = require("./config");
const {
  createGame,
  assignRoles,
  getAlive,
  checkWin,
} = require("./game-state");
const {
  buildLobbyMessage,
  buildGroupWelcomeMessage,
  buildPrivateStartMessage,
  buildDescribeIntroMessage,
  buildDescribeTurnMessage,
  buildVotePhaseMessage,
  buildEndGameMessage,
  buildHelpMessage,
  buildStatusMessage,
} = require("./messages");



const bot = new Bot(BOT_TOKEN);

// 将当前游戏状态持久化到数据库。
// 注意去掉不能序列化的字段（例如 voteTimeout）。
async function saveGame(game) {
  const plain = { ...game };
  delete plain.voteTimeout;
  await gameRepo.set(game.chatId, JSON.stringify(plain));
}

// 启动前先删除旧的 webhook/polling 连接
async function clearAndStart() {
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log("✅ Cleared old connections");
  } catch (e) {
    console.log("No old connections to clear");
  }
}

bot.catch((err) => {
  console.error(`Error for update ${err.ctx.update.update_id}:`, err.error.message);
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════
// BOT ADDED TO GROUP — Bilingual welcome
// ═══════════════════════════════════════
bot.on("my_chat_member", async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status;
  if (newStatus === "member" || newStatus === "administrator") {
    await ctx.reply(
      buildGroupWelcomeMessage(),
      { parse_mode: "HTML" }
    );
  }
});

// ═══════════════════════════════════════
// /spyme — Create game
// ═══════════════════════════════════════
bot.command("spyme", async (ctx) => {
  if (ctx.chat.type === "private") return ctx.reply("Please use this command in a group! 👥");
  const chatId = ctx.chat.id;
  const existing = await gameRepo.get(chatId);
  if (existing && existing.status !== "ended") {
    return ctx.reply("⚠️ There's already a game running! Send /end to finish it first.");
  }
  const game = createGame(chatId, ctx.chat.title || "", ctx.from.id, ctx.from.first_name);
  await saveGame(game);
  const kb = new InlineKeyboard()
    .text("✋ Join Game", "join")
    .row()
    .text("🚀 Start Game (host)", "start");
  const sent = await ctx.reply(buildLobbyMessage(game), { parse_mode: "HTML", reply_markup: kb });
  game.lobbyMsgId = sent.message_id;
  await saveGame(game);
});

// ═══════════════════════════════════════
// JOIN
// ═══════════════════════════════════════
bot.command("join", async (ctx) => {
  if (ctx.chat.type === "private") return;
  const game = await gameRepo.get(ctx.chat.id);
  if (!game || game.status !== "waiting") return ctx.reply("❌ No game to join. Send /spyme to create one!");
  if (game.players.find(p => p.userId === ctx.from.id)) return ctx.reply("You're already in the game!");
  game.players.push({ userId: ctx.from.id, name: ctx.from.first_name, role: null, word: null, isAlive: true });
  await saveGame(game);
  await updateLobby(ctx, game);
});

bot.callbackQuery("join", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
  if (!chatId) return;
  const game = await gameRepo.get(chatId);
  if (!game || game.status !== "waiting") return;
  if (game.players.find(p => p.userId === ctx.from.id)) {
    return ctx.answerCallbackQuery({ text: "You're already in!", show_alert: true });
  }
  game.players.push({ userId: ctx.from.id, name: ctx.from.first_name, role: null, word: null, isAlive: true });
  await saveGame(game);
  await updateLobby(ctx, game);
});

async function updateLobby(ctx, game) {
  const kb = new InlineKeyboard()
    .text("✋ Join Game", "join")
    .row()
    .text("🚀 Start Game (host)", "start");
  try {
    await ctx.api.editMessageText(game.chatId, game.lobbyMsgId, buildLobbyMessage(game), {
      parse_mode: "HTML", reply_markup: kb,
    });
  } catch (e) {
    const sent = await ctx.reply(buildLobbyMessage(game), { parse_mode: "HTML", reply_markup: kb });
    game.lobbyMsgId = sent.message_id;
    await saveGame(game);
  }
}

// ═══════════════════════════════════════
// START GAME
// ═══════════════════════════════════════
async function doStart(ctx, game) {
  if (game.players.length < 4) {
    return ctx.reply(`❌ Only ${game.players.length} players. Need at least 4!`);
  }
  assignRoles(game);
  game.status = "describing";
  game.describeIndex = 0;
  await saveGame(game);

  await ctx.reply(
    `🎮 <b>Game starting!</b> ${game.players.length} players\n📬 Sending secret words via DM...`,
    { parse_mode: "HTML" }
  );

  const failedPlayers = [];

  for (const p of game.players) {
    const wordDisplay = p.role === "blank" ? "???" : `<b>${p.word}</b>`;
    const msg =
      `🔒 <b>Your secret word</b>\n\n` +
      `You received: ${wordDisplay}\n\n` +
      `Describe it without saying it directly!\n` +
      `🤫 Don't reveal your word — or your identity.`;
    try {
      await bot.api.sendMessage(p.userId, msg, { parse_mode: "HTML" });
    } catch (e) {
      failedPlayers.push(p);
    }
  }

  if (failedPlayers.length > 0) {
    // 将无法收到 DM 的玩家移出本局，避免破坏游戏体验
    game.players = game.players.filter(
      (p) => !failedPlayers.some((f) => f.userId === p.userId)
    );
    await saveGame(game);

    const names = failedPlayers.map((p) => p.name).join(", ");
    await ctx.reply(
      `⚠️ Can't DM: <b>${names}</b>.\nThey have been removed from this game.\nAsk them to DM @${BOT_USERNAME} and send /start, then /join again next time.`,
      { parse_mode: "HTML" }
    );

    if (game.players.length < 4) {
      game.status = "ended";
      await saveGame(game);
      await ctx.reply(
        `❌ After removing players who can't receive DMs, only ${game.players.length} players remain.\nThe game is cancelled. Please make sure everyone has DM'd @${BOT_USERNAME} with /start, then use /spyme to start a new game.`,
        { parse_mode: "HTML" }
      );
      await gameRepo.delete(game.chatId);
      return;
    }
  }

  await sleep(1500);
  await promptNextDescribe(game);
}

bot.command("start", async (ctx) => {
  if (ctx.chat.type === "private") {
    await ctx.reply(
      buildPrivateStartMessage(),
      { parse_mode: "HTML" }
    );
    return;
  }
  const game = await gameRepo.get(ctx.chat.id);
  if (!game) return ctx.reply("❌ No game found. Send /spyme to create one!");
  if (ctx.from.id !== game.hostId) return ctx.reply("❌ Only the host can start the game!");
  if (game.status !== "waiting") return ctx.reply("❌ Game already started!");
  await doStart(ctx, game);
});

bot.callbackQuery("start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
  if (!chatId) return;
  const game = await gameRepo.get(chatId);
  if (!game || game.status !== "waiting") return;
  if (ctx.from.id !== game.hostId) {
    return ctx.answerCallbackQuery({ text: "Only the host can start!", show_alert: true });
  }
  await doStart(ctx, game);
});

// ═══════════════════════════════════════
// DESCRIBE PHASE
// ═══════════════════════════════════════
async function promptNextDescribe(game) {
  const alive = getAlive(game);
  const idx = game.describeIndex;

  if (idx >= alive.length) {
    await startVotePhase(game);
    return;
  }

  const current = alive[idx];
  const progress = `${idx + 1}/${alive.length}`;

  if (idx === 0) {
    await bot.api.sendMessage(game.chatId,
      buildDescribeIntroMessage(game),
      { parse_mode: "HTML" }
    );
  }

  const kb = new InlineKeyboard().text("✅ Done — next player!", `desc_done_${current.userId}`);
  const sent = await bot.api.sendMessage(game.chatId,
    buildDescribeTurnMessage(current, progress),
    { parse_mode: "HTML", reply_markup: kb }
  );
  game.describeMsgId = sent.message_id;
   await saveGame(game);
}

bot.callbackQuery(/^desc_done_(\d+)$/, async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
  if (!chatId) return ctx.answerCallbackQuery();
  const game = await gameRepo.get(chatId);
  if (!game || game.status !== "describing") {
    return ctx.answerCallbackQuery({ text: "This round has ended.", show_alert: true });
  }

  const alive = getAlive(game);
  const current = alive[game.describeIndex];

  if (ctx.from.id !== current.userId) {
    return ctx.answerCallbackQuery({ text: `It's ${current.name}'s turn!`, show_alert: true });
  }

  await ctx.answerCallbackQuery({ text: "✅ Got it!" });

  try {
    await ctx.api.editMessageText(game.chatId, game.describeMsgId,
      `✅ <b>${current.name}</b> has described their word.`,
      { parse_mode: "HTML" }
    );
  } catch (e) {}

  game.describeIndex++;
  await saveGame(game);
  await sleep(500);
  await promptNextDescribe(game);
});

// ═══════════════════════════════════════
// VOTE PHASE
// ═══════════════════════════════════════
async function startVotePhase(game) {
  game.status = "voting";
  game.voteResolved = false;
  if (!game.votes[String(game.round)]) game.votes[String(game.round)] = {};
  await saveGame(game);
  const alive = getAlive(game);

  const kb = new InlineKeyboard();
  alive.forEach((p, i) => {
    kb.text(p.name, `vote_${p.userId}`);
    if (i % 2 === 1) kb.row();
  });

  await bot.api.sendMessage(game.chatId,
    buildVotePhaseMessage(game),
    { parse_mode: "HTML", reply_markup: kb }
  );

  game.voteTimeout = setTimeout(() => resolveVotes(game.chatId, game.round), 120000);
}

bot.callbackQuery(/^vote_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const targetId = Number(ctx.match[1]);
  const voterId = ctx.from.id;
  const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
  if (!chatId) return;
  const game = await gameRepo.get(chatId);
  if (!game || game.status !== "voting") {
    return ctx.answerCallbackQuery({ text: "This round has ended.", show_alert: true });
  }

  const roundVotes = game.votes[game.round] || game.votes[String(game.round)] || {};
  if (roundVotes[voterId] !== undefined) {
    return ctx.answerCallbackQuery({ text: "You already voted!", show_alert: true });
  }
  if (!game.players.find(p => p.userId === voterId && p.isAlive)) {
    return ctx.answerCallbackQuery({ text: "You're out — no voting!", show_alert: true });
  }
  if (!game.players.find(p => p.userId === targetId && p.isAlive)) {
    return ctx.answerCallbackQuery({ text: "That player is already out!", show_alert: true });
  }

  roundVotes[voterId] = targetId;
  game.votes[String(game.round)] = roundVotes;

  const targetName = game.players.find(p => p.userId === targetId)?.name || "someone";
  await ctx.reply(`✅ <b>${ctx.from.first_name}</b> voted for <b>${targetName}</b>`, { parse_mode: "HTML" });

  const alive = getAlive(game);
  if (Object.keys(roundVotes).length >= alive.length) {
    await saveGame(game);
    await resolveVotes(game.chatId, game.round);
  }
});

// ═══════════════════════════════════════
// RESOLVE VOTES
// ═══════════════════════════════════════
async function resolveVotes(chatId, round) {
  const game = await gameRepo.get(chatId);
  if (!game || game.status !== "voting") return;

  if (game.voteResolved) return;
  game.voteResolved = true;
  if (game.voteTimeout) {
    clearTimeout(game.voteTimeout);
    game.voteTimeout = null;
  }
  await saveGame(game);

  const roundVotes = game.votes[round] || game.votes[String(round)] || {};
  const tally = {};
  getAlive(game).forEach(p => { tally[p.userId] = 0; });
  Object.values(roundVotes).forEach(tid => { tally[tid] = (tally[tid] || 0) + 1; });

  const max = Math.max(...Object.values(tally));
  const top = Object.keys(tally).filter(id => tally[id] === max);

  if (top.length > 1) {
    await bot.api.sendMessage(chatId,
      `⚖️ <b>It's a tie!</b> No one is eliminated. Next round!`,
      { parse_mode: "HTML" }
    );
    game.round++;
    game.status = "describing";
    game.describeIndex = 0;
    await saveGame(game);
    await promptNextDescribe(game);
    return;
  }

  const elimId = Number(top[0]);
  const elim = game.players.find(p => p.userId === elimId);
  elim.isAlive = false;
  await saveGame(game);

  await bot.api.sendMessage(chatId,
    `⚡ <b>${elim.name} has been eliminated!</b>\n\n` +
    `Votes: ${tally[elimId]}\n\n` +
    `🤫 Identity revealed at the end...`,
    { parse_mode: "HTML" }
  );

  const winner = checkWin(game);
  if (winner) {
    game.status = "ended";
    await saveGame(game);
    await endGame(chatId, game, winner);
  } else {
    game.round++;
    game.status = "describing";
    game.describeIndex = 0;
    await saveGame(game);
    await sleep(1500);
    await promptNextDescribe(game);
  }
}

// ═══════════════════════════════════════
// GAME OVER + BLINK CTA
// ═══════════════════════════════════════
async function endGame(chatId, game, winner) {
  const msg = buildEndGameMessage(game, winner);

  const kb = new InlineKeyboard()
    .url(`💘 Find your match on Blink`, `${BLINK_URL}?start=spyme_end`)
    .row()
    .text("🔄 Play again", "new_game");

  await bot.api.sendMessage(chatId, msg, { parse_mode: "HTML", reply_markup: kb });
  await gameRepo.delete(chatId);
}

// ═══════════════════════════════════════
// /end & /help
// ═══════════════════════════════════════
bot.command("end", async (ctx) => {
  if (ctx.chat.type === "private") return;
  const game = await gameRepo.get(ctx.chat.id);
  if (!game) return ctx.reply("No active game.");
  if (ctx.from.id !== game.hostId) return ctx.reply("❌ Only the host can end the game!");
  await gameRepo.delete(ctx.chat.id);
  await ctx.reply("🛑 Game ended. Send /spyme to start a new one!");
});

bot.callbackQuery("new_game", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Send /spyme to start a new game!" });
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    buildHelpMessage(),
    { parse_mode: "HTML" }
  );
});

// 简单健康检查命令
bot.command(["ping", "status"], async (ctx) => {
  await ctx.reply(buildStatusMessage(), { parse_mode: "HTML" });
});

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
console.log("🕵️ SpyMe Bot starting...");
initDB()
  .then(() => clearAndStart())
  .then(() => {
    bot.start({
      onStart: (info) => console.log(`✅ Live: @${info.username}\nSend /spyme in a group to play!`),
    }).catch((err) => {
      console.error("Bot crashed:", err.message);
      setTimeout(() => process.exit(1), 5000);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });