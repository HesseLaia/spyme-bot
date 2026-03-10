const { Bot, InlineKeyboard } = require("grammy");

const BOT_TOKEN = "8726934451:AAGNozL9yDSRWu78DvJWre6XVLvVG_DWHXw";
const BOT_USERNAME = "sPymeEeee_bot";
const BLINK_BOT = "Blink_AImatch_Bot";
const BLINK_URL = `https://t.me/${BLINK_BOT}`;

const bot = new Bot(BOT_TOKEN);
const games = new Map();

// ═══════════════════════════════════════
// WORD PAIRS — English, Gen Z / International
// ═══════════════════════════════════════
const WORD_PAIRS = [
  // 💘 Love & Relationships
  { c: "Crush", s: "Admire" },
  { c: "Ghosting", s: "Ignoring" },
  { c: "Situationship", s: "Talking stage" },
  { c: "Soulmate", s: "True love" },
  { c: "Breakup", s: "Split up" },
  { c: "Flirting", s: "Teasing" },
  { c: "Long distance", s: "Far away relationship" },
  { c: "First date", s: "First meeting" },
  { c: "Jealousy", s: "Possessiveness" },
  { c: "Breadcrumbing", s: "Leading on" },

  // 🧠 Identity & Personality
  { c: "Introvert", s: "Shy" },
  { c: "Extrovert", s: "Outgoing" },
  { c: "Empath", s: "Sensitive" },
  { c: "Narcissist", s: "Egotist" },
  { c: "Perfectionist", s: "Overachiever" },
  { c: "Rebel", s: "Troublemaker" },
  { c: "Overthinker", s: "Anxious" },
  { c: "People pleaser", s: "Pushover" },

  // 🚩 Red flags & Toxic culture
  { c: "Red flag", s: "Warning sign" },
  { c: "Toxic", s: "Unhealthy" },
  { c: "Gaslight", s: "Manipulate" },
  { c: "Love bombing", s: "Overwhelming affection" },
  { c: "Clingy", s: "Needy" },
  { c: "Controlling", s: "Possessive" },

  // 📱 Internet culture & Gen Z slang
  { c: "Vibe", s: "Energy" },
  { c: "Rizz", s: "Charm" },
  { c: "NPC", s: "Background character" },
  { c: "Main character", s: "Protagonist" },
  { c: "Delulu", s: "Delusional" },
  { c: "Soft life", s: "Easy life" },
  { c: "Glow up", s: "Transformation" },
  { c: "Era", s: "Phase" },
  { c: "Burnout", s: "Exhaustion" },
  { c: "Aesthetics", s: "Vibes" },

  // 🌍 Lifestyle & Values
  { c: "Minimalism", s: "Simple living" },
  { c: "Wanderlust", s: "Travel addiction" },
  { c: "Night owl", s: "Insomniac" },
  { c: "Homebody", s: "Hermit" },
  { c: "Gym rat", s: "Fitness freak" },
  { c: "Vegan", s: "Vegetarian" },
  { c: "Meditation", s: "Mindfulness" },
  { c: "Therapy", s: "Counseling" },

  // 🎭 Emotions & Mental health
  { c: "Anxiety", s: "Stress" },
  { c: "Loneliness", s: "Solitude" },
  { c: "Freedom", s: "Independence" },
  { c: "Regret", s: "Guilt" },
  { c: "Self-confidence", s: "Self-esteem" },
  { c: "Healing", s: "Recovery" },
  { c: "Boundaries", s: "Limits" },
  { c: "Lost", s: "Confused" },

  // 🔥 Hot takes & Social topics
  { c: "Feminism", s: "Gender equality" },
  { c: "Cancel culture", s: "Call-out culture" },
  { c: "Privilege", s: "Advantage" },
  { c: "Open relationship", s: "Polyamory" },
  { c: "Coming out", s: "Being open" },
  { c: "Body positivity", s: "Self-acceptance" },
  { c: "Hookup culture", s: "Casual dating" },
  { c: "Age gap", s: "Big age difference" },
];

function randomPair() {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}

// ═══════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════
function createGame(chatId, chatTitle, hostId, hostName) {
  return {
    chatId, chatTitle, status: "waiting",
    hostId, hostName,
    players: [{ userId: hostId, name: hostName, role: null, word: null, isAlive: true }],
    civilianWord: null, spyWord: null,
    round: 1, votes: {}, lobbyMsgId: null,
    describeIndex: 0, describeMsgId: null,
  };
}

function assignRoles(game) {
  const n = game.players.length;
  const spyCount = n >= 9 ? 2 : 1;
  const hasBlank = n >= 7;
  const pair = randomPair();
  game.civilianWord = pair.c;
  game.spyWord = pair.s;
  const roles = Array(n).fill("civilian");
  const idx = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < spyCount; i++) roles[idx[i]] = "spy";
  if (hasBlank) roles[idx[spyCount]] = "blank";
  game.players.forEach((p, i) => {
    p.role = roles[i];
    p.word = roles[i] === "civilian" ? pair.c : roles[i] === "spy" ? pair.s : "???";
    p.isAlive = true;
  });
}

function getAlive(game) { return game.players.filter(p => p.isAlive); }

function checkWin(game) {
  const alive = getAlive(game);
  const spies = alive.filter(p => p.role === "spy");
  const civs = alive.filter(p => p.role === "civilian");
  const blanks = alive.filter(p => p.role === "blank");
  if (spies.length === 0 && blanks.length === 0) return "civilian";
  if (blanks.length > 0 && alive.length <= 2 && spies.length === 0) return "blank";
  if (civs.length <= spies.length) return "spy";
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function lobbyMsg(game) {
  const list = game.players.map(p => `• ${p.name}`).join("\n");
  return (
    `🕵️ <b>SpyMe — Who's the Spy?</b>\n\n` +
    `Players joined (${game.players.length}):\n${list}\n\n` +
    `Need at least 4 players. Host tap <b>Start Game</b> when ready!`
  );
}

// ═══════════════════════════════════════
// BOT ADDED TO GROUP — Bilingual welcome
// ═══════════════════════════════════════
bot.on("my_chat_member", async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status;
  if (newStatus === "member" || newStatus === "administrator") {
    await ctx.reply(
      `🕵️ <b>SpyMe is here!</b>\n` +
      `Ready to find the spy in your group? 👀\n\n` +
      `<b>Before we start — everyone must:</b>\n` +
      `1️⃣ DM me first → @${BOT_USERNAME} → send /start\n` +
      `(so I can send you your secret word 🤫)\n\n` +
      `<b>Then in this group:</b>\n` +
      `▶️ /spyme — create a game\n` +
      `✋ /join — join the game\n` +
      `🚀 /start — begin (host only)\n\n` +
      `Min 4 players · Max 12 · ~10 min 🔥\n\n` +
      `━━━━━━━━━━━━━━\n` +
      `🕵️ <b>SpyMe здесь!</b>\n` +
      `Готовы найти шпиона? 👀\n\n` +
      `<b>Перед началом каждый должен:</b>\n` +
      `1️⃣ Написать мне в личку → @${BOT_USERNAME} → отправить /start\n\n` +
      `<b>Затем в этой группе:</b>\n` +
      `▶️ /spyme — создать игру\n` +
      `✋ /join — присоединиться\n` +
      `🚀 /start — начать (только хост)\n\n` +
      `Мин. 4 игрока · Макс. 12 · ~10 мин 🔥`,
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
  const sent = await ctx.reply(lobbyMsg(game), { parse_mode: "HTML", reply_markup: kb });
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
    await ctx.api.editMessageText(game.chatId, game.lobbyMsgId, lobbyMsg(game), {
      parse_mode: "HTML", reply_markup: kb,
    });
  } catch (e) {
    const sent = await ctx.reply(lobbyMsg(game), { parse_mode: "HTML", reply_markup: kb });
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
      await ctx.reply(
        `⚠️ Can't DM <b>${p.name}</b>!\nPlease DM @${BOT_USERNAME} and send /start first, then rejoin.`,
        { parse_mode: "HTML" }
      );
    }
  }

  await sleep(1500);
  await promptNextDescribe(game);
}

bot.command("start", async (ctx) => {
  if (ctx.chat.type === "private") {
    await ctx.reply(
      `🕵️ <b>Hey! I'm SpyMe.</b>\n\n` +
      `I'm a group game bot — add me to a group and type /spyme to start!\n\n` +
      `✅ You're now activated. Go back to your group and play!\n\n` +
      `💘 Also check out <b>Blink</b>:\n👉 @${BLINK_BOT}`,
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
      `📢 <b>Round ${game.round} · Describe Phase</b>\n\n` +
      `Take turns describing your word. ⚠️ Don't say it directly!\n` +
      `When done, tap the button to pass to the next player.`,
      { parse_mode: "HTML" }
    );
  }

  const kb = new InlineKeyboard().text("✅ Done — next player!", `desc_done_${current.userId}`);
  const sent = await bot.api.sendMessage(game.chatId,
    `🎤 <b>${current.name}'s turn</b> (${progress})\n\n` +
    `${current.name}, describe your word in the group chat, then tap the button!`,
    { parse_mode: "HTML", reply_markup: kb }
  );
  game.describeMsgId = sent.message_id;
}

bot.callbackQuery(/^desc_done_(\d+)$/, async (ctx) => {
  const game = games.get(ctx.chat.id);
  if (!game || game.status !== "describing") return ctx.answerCallbackQuery();

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
  if (!game.votes[game.round]) game.votes[game.round] = {};
  const alive = getAlive(game);

  const kb = new InlineKeyboard();
  alive.forEach((p, i) => {
    kb.text(p.name, `vote_${p.userId}`);
    if (i % 2 === 1) kb.row();
  });

  await bot.api.sendMessage(game.chatId,
    `🗳️ <b>Round ${game.round} · Vote</b>\n\n` +
    `Who do you think is the spy? Tap to vote!\n` +
    `One vote per person · 120 seconds ⏳`,
    { parse_mode: "HTML", reply_markup: kb }
  );

  setTimeout(() => resolveVotes(game.chatId, game.round), 120000);
}

bot.callbackQuery(/^vote_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const targetId = Number(ctx.match[1]);
  const voterId = ctx.from.id;
  const game = games.get(ctx.chat.id);
  if (!game || game.status !== "voting") return;

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
  let title, sub;
  if (winner === "civilian") {
    title = "🎉 Civilians win!"; sub = "The spy has been caught!";
  } else if (winner === "spy") {
    title = "😈 Spy wins!"; sub = "The spy survived to the end!";
  } else {
    title = "⚪ Blank wins!"; sub = "The blank card guessed the word!";
  }

  const reveal = game.players.map(p => {
    const r = p.role === "spy" ? "Spy 🔴" : p.role === "blank" ? "Blank ⚪" : "Civilian 🟢";
    return `• <b>${p.name}</b>: ${r} — <i>${p.word}</i>`;
  }).join("\n");

  const msg =
    `${title}\n<i>${sub}</i>\n\n` +
    `Civilian word: <b>${game.civilianWord}</b>\n` +
    `Spy word: <b>${game.spyWord}</b>\n\n` +
    `<b>Full reveal:</b>\n${reveal}\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `💘 Did someone catch your eye during the game?\n` +
    `Match with real people on <b>Blink</b> — swipe, connect, vibe.`;

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
    `🕵️ <b>SpyMe — Who's the Spy?</b>\n\n` +
    `<b>Commands (use in a group):</b>\n` +
    `/spyme — create a game\n` +
    `/join — join the game\n` +
    `/start — begin (host only)\n` +
    `/end — end the game\n\n` +
    `<b>How to play:</b>\n` +
    `Everyone gets a secret word. Most players share the same word — the spy gets a similar but different one.\n` +
    `Take turns describing. Vote out who you think is the spy!\n\n` +
    `4–12 players · ~10 minutes`,
    { parse_mode: "HTML" }
  );
});

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
console.log("🕵️ SpyMe Bot starting...");
bot.start({
  onStart: (info) => console.log(`✅ Live: @${info.username}\nSend /spyme in a group to play!`),
});