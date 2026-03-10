const { Bot, InlineKeyboard } = require("grammy");
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
const games = new Map();

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
// ERROR HANDLER
// ═══════════════════════════════════════
bot.catch((err) => {
  console.error(`Error for update ${err.ctx.update.update_id}:`, err.error.message);
});

// ═══════════════════════════════════════
// /spyme — Create game
// ═══════════════════════════════════════
bot.command("spyme", async (ctx) => {
  if (ctx.chat.type === "private") return ctx.reply("Please use this command in a group! 👥");
  const chatId = ctx.chat.id;
  const existing = games.get(chatId);
  if (existing && existing.status !== "ended") {
    return ctx.reply("⚠️ There's already a game running! Send /end to finish it first.");
  }
  const game = createGame(chatId, ctx.chat.title || "", ctx.from.id, ctx.from.first_name);
  games.set(chatId, game);
  const kb = new InlineKeyboard()
    .text("✋ Join Game", "join")
    .row()
    .text("🚀 Start Game (host)", "start");
  const sent = await ctx.reply(buildLobbyMessage(game), { parse_mode: "HTML", reply_markup: kb });
  game.lobbyMsgId = sent.message_id;
});

// ═══════════════════════════════════════
// JOIN
// ═══════════════════════════════════════
bot.command("join", async (ctx) => {
  if (ctx.chat.type === "private") return;
  const game = games.get(ctx.chat.id);
  if (!game || game.status !== "waiting") return ctx.reply("❌ No game to join. Send /spyme to create one!");
  if (game.players.find(p => p.userId === ctx.from.id)) return ctx.reply("You're already in the game!");
  game.players.push({ userId: ctx.from.id, name: ctx.from.first_name, role: null, word: null, isAlive: true });
  await updateLobby(ctx, game);
});

bot.callbackQuery("join", async (ctx) => {
  await ctx.answerCallbackQuery();
  const game = games.get(ctx.chat.id);
  if (!game || game.status !== "waiting") return;
  if (game.players.find(p => p.userId === ctx.from.id)) {
    return ctx.answerCallbackQuery({ text: "You're already in!", show_alert: true });
  }
  game.players.push({ userId: ctx.from.id, name: ctx.from.first_name, role: null, word: null, isAlive: true });
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

    const names = failedPlayers.map((p) => p.name).join(", ");
    await ctx.reply(
      `⚠️ Can't DM: <b>${names}</b>.\nThey have been removed from this game.\nAsk them to DM @${BOT_USERNAME} and send /start, then /join again next time.`,
      { parse_mode: "HTML" }
    );

    if (game.players.length < 4) {
      game.status = "ended";
      await ctx.reply(
        `❌ After removing players who can't receive DMs, only ${game.players.length} players remain.\nThe game is cancelled. Please make sure everyone has DM'd @${BOT_USERNAME} with /start, then use /spyme to start a new game.`,
        { parse_mode: "HTML" }
      );
      games.delete(game.chatId);
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
  const game = games.get(ctx.chat.id);
  if (!game) return ctx.reply("❌ No game found. Send /spyme to create one!");
  if (ctx.from.id !== game.hostId) return ctx.reply("❌ Only the host can start the game!");
  if (game.status !== "waiting") return ctx.reply("❌ Game already started!");
  await doStart(ctx, game);
});

bot.callbackQuery("start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const game = games.get(ctx.chat.id);
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
}

bot.callbackQuery(/^desc_done_(\d+)$/, async (ctx) => {
  const game = games.get(ctx.chat.id);
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
  await sleep(500);
  await promptNextDescribe(game);
});

// ═══════════════════════════════════════
// VOTE PHASE
// ═══════════════════════════════════════
async function startVotePhase(game) {
  game.status = "voting";
  game.voteResolved = false;
  if (!game.votes[game.round]) game.votes[game.round] = {};
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
  const game = games.get(ctx.chat.id);
  if (!game || game.status !== "voting") {
    return ctx.answerCallbackQuery({ text: "This round has ended.", show_alert: true });
  }

  const roundVotes = game.votes[game.round] || {};
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
  game.votes[game.round] = roundVotes;

  const targetName = game.players.find(p => p.userId === targetId)?.name || "someone";
  await ctx.reply(`✅ <b>${ctx.from.first_name}</b> voted for <b>${targetName}</b>`, { parse_mode: "HTML" });

  const alive = getAlive(game);
  if (Object.keys(roundVotes).length >= alive.length) {
    await resolveVotes(game.chatId, game.round);
  }
});

// ═══════════════════════════════════════
// RESOLVE VOTES
// ═══════════════════════════════════════
async function resolveVotes(chatId, round) {
  const game = games.get(chatId);
  if (!game || game.status !== "voting") return;

  if (game.voteResolved) return;
  game.voteResolved = true;
  if (game.voteTimeout) {
    clearTimeout(game.voteTimeout);
    game.voteTimeout = null;
  }

  const roundVotes = game.votes[round] || {};
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
    await promptNextDescribe(game);
    return;
  }

  const elimId = Number(top[0]);
  const elim = game.players.find(p => p.userId === elimId);
  elim.isAlive = false;

  await bot.api.sendMessage(chatId,
    `⚡ <b>${elim.name} has been eliminated!</b>\n\n` +
    `Votes: ${tally[elimId]}\n\n` +
    `🤫 Identity revealed at the end...`,
    { parse_mode: "HTML" }
  );

  const winner = checkWin(game);
  if (winner) {
    game.status = "ended";
    await endGame(chatId, game, winner);
  } else {
    game.round++;
    game.status = "describing";
    game.describeIndex = 0;
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
  games.delete(chatId);
}

// ═══════════════════════════════════════
// /end & /help
// ═══════════════════════════════════════
bot.command("end", async (ctx) => {
  if (ctx.chat.type === "private") return;
  const game = games.get(ctx.chat.id);
  if (!game) return ctx.reply("No active game.");
  if (ctx.from.id !== game.hostId) return ctx.reply("❌ Only the host can end the game!");
  games.delete(ctx.chat.id);
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
bot.start({
  onStart: (info) => console.log(`✅ Live: @${info.username}\nSend /spyme in a group to play!`),
}).catch((err) => {
  console.error("Bot crashed:", err.message);
  setTimeout(() => process.exit(1), 3000); // 等3秒再退出，给旧连接时间断开
});
