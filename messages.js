// 统一管理 Bot 使用的文案

const { BOT_USERNAME, BLINK_BOT, BLINK_URL } = require("./config");

function buildLobbyMessage(game) {
  const list = game.players.map((p) => `• ${p.name}`).join("\n");
  return (
    `🕵️ <b>SpyMe — Who's the Spy?</b>\n\n` +
    `Players joined (${game.players.length}):\n${list}\n\n` +
    `Need at least 4 players. Host tap <b>Start Game</b> when ready!`
  );
}

function buildGroupWelcomeMessage() {
  return (
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
    `Мин. 4 игрока · Макс. 12 · ~10 мин 🔥`
  );
}

function buildPrivateStartMessage() {
  return (
    `🕵️ <b>Hey! I'm SpyMe.</b>\n\n` +
    `I'm a group game bot — add me to a group and type /spyme to start!\n\n` +
    `✅ You're now activated. Go back to your group and play!\n\n` +
    `💘 Also check out <b>Blink</b>:\n👉 @${BLINK_BOT}`
  );
}

function buildDescribeIntroMessage(game) {
  return (
    `📢 <b>Round ${game.round} · Describe Phase</b>\n\n` +
    `Take turns describing your word. ⚠️ Don't say it directly!\n` +
    `When done, tap the button to pass to the next player.`
  );
}

function buildDescribeTurnMessage(current, progress) {
  return (
    `🎤 <b>${current.name}'s turn</b> (${progress})\n\n` +
    `${current.name}, describe your word in the group chat, then tap the button!`
  );
}

function buildVotePhaseMessage(game) {
  return (
    `🗳️ <b>Round ${game.round} · Vote</b>\n\n` +
    `Who do you think is the spy? Tap to vote!\n` +
    `One vote per person · 120 seconds ⏳`
  );
}

function buildEndGameMessage(game, winner) {
  let title, sub;
  if (winner === "civilian") {
    title = "🎉 Civilians win!";
    sub = "The spy has been caught!";
  } else if (winner === "spy") {
    title = "😈 Spy wins!";
    sub = "The spy survived to the end!";
  } else {
    title = "⚪ Blank wins!";
    sub = "The blank card guessed the word!";
  }

  const reveal = game.players
    .map((p) => {
      const r =
        p.role === "spy"
          ? "Spy 🔴"
          : p.role === "blank"
          ? "Blank ⚪"
          : "Civilian 🟢";
      return `• <b>${p.name}</b>: ${r} — <i>${p.word}</i>`;
    })
    .join("\n");

  return (
    `${title}\n<i>${sub}</i>\n\n` +
    `Civilian word: <b>${game.civilianWord}</b>\n` +
    `Spy word: <b>${game.spyWord}</b>\n\n` +
    `<b>Full reveal:</b>\n${reveal}\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `💘 Did someone catch your eye during the game?\n` +
    `Match with real people on <b>Blink</b> — swipe, connect, vibe.`
  );
}

function buildHelpMessage() {
  return (
    `🕵️ <b>SpyMe — Who's the Spy?</b>\n\n` +
    `<b>Commands (use in a group):</b>\n` +
    `/spyme — create a game\n` +
    `/join — join the game\n` +
    `/start — begin (host only)\n` +
    `/end — end the game\n\n` +
    `<b>How to play:</b>\n` +
    `Everyone gets a secret word. Most players share the same word — the spy gets a similar but different one.\n` +
    `Take turns describing. Vote out who you think is the spy!\n\n` +
    `4–12 players · ~10 minutes`
  );
}

function buildStatusMessage() {
  return (
    `✅ <b>SpyMe status</b>\n\n` +
    `Bot is running.\n` +
    `Username: @${BOT_USERNAME}\n` +
    `Blink partner: @${BLINK_BOT}\n`
  );
}

module.exports = {
  buildLobbyMessage,
  buildGroupWelcomeMessage,
  buildPrivateStartMessage,
  buildDescribeIntroMessage,
  buildDescribeTurnMessage,
  buildVotePhaseMessage,
  buildEndGameMessage,
  buildHelpMessage,
  buildStatusMessage,
};

