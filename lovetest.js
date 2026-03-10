const { Bot, InlineKeyboard } = require("grammy");

// ⚠️ 换成你的 Love Test Bot Token（去 @BotFather 新建一个 Bot）
const BOT_TOKEN = "8522230287:AAELLNNXUa8RxNSjPYj1iXeYoHpoSGP9keU";
const BLINK_BOT = "Blink_AImatch_Bot";
const BLINK_URL = `https://t.me/${BLINK_BOT}`;

const bot = new Bot(BOT_TOKEN);

// 用户答题状态存储
const sessions = new Map(); // userId -> { step, scores: {spark, depth, free, anchor} }

// ═══════════════════════════════════════
// 题目库 — 10道恋爱场景题
// ═══════════════════════════════════════
const QUESTIONS = [
  {
    text: `💬 *Question 1 / 10*\n\nYou just met someone interesting at a party. What do you do?`,
    options: [
      { label: "🔥 Walk up and start flirting immediately", type: "spark" },
      { label: "🌊 Find a quiet corner and have a deep conversation", type: "depth" },
      { label: "🌟 Exchange socials and keep it casual", type: "free" },
      { label: "🏡 Wait for them to come to you first", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 2 / 10*\n\nYour partner cancels your date last minute. How do you react?`,
    options: [
      { label: "🔥 Feel frustrated and need to talk it out NOW", type: "spark" },
      { label: "🌊 Feel hurt but try to understand their reasons", type: "depth" },
      { label: "🌟 No big deal — make other plans instantly", type: "free" },
      { label: "🏡 Say it's fine, but quietly feel disappointed", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 3 / 10*\n\nWhat does your ideal first date look like?`,
    options: [
      { label: "🔥 Spontaneous adventure — surprise me!", type: "spark" },
      { label: "🌊 Long dinner where we talk for hours", type: "depth" },
      { label: "🌟 Something fun and low-pressure, like mini golf", type: "free" },
      { label: "🏡 Cozy home cooking or a familiar café", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 4 / 10*\n\nHow do you usually express love?`,
    options: [
      { label: "🔥 Grand gestures and lots of physical affection", type: "spark" },
      { label: "🌊 Heartfelt words and remembering every detail", type: "depth" },
      { label: "🌟 Sharing experiences and adventures together", type: "free" },
      { label: "🏡 Acts of service — I show up and take care of things", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 5 / 10*\n\nWhat's your biggest fear in a relationship?`,
    options: [
      { label: "🔥 Things becoming boring and routine", type: "spark" },
      { label: "🌊 Not being truly understood or seen", type: "depth" },
      { label: "🌟 Losing my independence and sense of self", type: "free" },
      { label: "🏡 Being abandoned or left behind", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 6 / 10*\n\nYou and your partner have a big argument. What happens next?`,
    options: [
      { label: "🔥 I need to resolve it immediately, can't sleep on it", type: "spark" },
      { label: "🌊 I process my feelings first, then have a calm talk", type: "depth" },
      { label: "🌟 I need space before I can discuss anything", type: "free" },
      { label: "🏡 I tend to give in to keep the peace", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 7 / 10*\n\nWhat do you value most in a partner?`,
    options: [
      { label: "🔥 Passion and chemistry — the spark has to be there", type: "spark" },
      { label: "🌊 Emotional depth and genuine understanding", type: "depth" },
      { label: "🌟 Shared values and respecting my freedom", type: "free" },
      { label: "🏡 Loyalty, reliability, and consistency", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 8 / 10*\n\nHow quickly do you fall in love?`,
    options: [
      { label: "🔥 Fast — I feel it in my gut right away", type: "spark" },
      { label: "🌊 Slowly — I need to know someone deeply first", type: "depth" },
      { label: "🌟 It depends — I don't follow a pattern", type: "free" },
      { label: "🏡 Gradually — I need to feel safe first", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 9 / 10*\n\nYour partner gets a dream job offer in another city. What do you think?`,
    options: [
      { label: "🔥 If we're meant to be, we'll figure it out — let's go!", type: "spark" },
      { label: "🌊 I'd want deep, honest conversations about our future", type: "depth" },
      { label: "🌟 It could be a great adventure for both of us", type: "free" },
      { label: "🏡 I'd worry a lot — stability matters to me", type: "anchor" },
    ],
  },
  {
    text: `💬 *Question 10 / 10*\n\nWhat does a perfect relationship feel like to you?`,
    options: [
      { label: "🔥 Electric — always exciting, never predictable", type: "spark" },
      { label: "🌊 A safe space where I'm fully known and accepted", type: "depth" },
      { label: "🌟 Two whole people choosing each other freely", type: "free" },
      { label: "🏡 A warm home — steady, safe, and always there", type: "anchor" },
    ],
  },
];

// ═══════════════════════════════════════
// 结果模板 — 4种恋爱性格
// ═══════════════════════════════════════
const RESULTS = {
  spark: {
    emoji: "🔥",
    title: "The Spark",
    tagline: "Passionate · Bold · Magnetic",
    description: `You love with full intensity. When you're into someone, everyone around you can feel it — your energy is magnetic and your affection is impossible to miss.\n\nYou thrive on excitement and connection. Routine scares you more than heartbreak. You'd rather have a short, burning flame than a long, lukewarm slow burn.\n\n*Your superpower:* You make people feel truly desired.\n*Your blind spot:* You sometimes confuse intensity for compatibility.`,
    ideal_match: "You need someone who can match your energy — or ground you when you burn too bright.",
    blink_hook: `🔥 There are people on Blink who can handle your fire.\nFind someone who sparks with you — not just someone who survives you.`,
  },
  depth: {
    emoji: "🌊",
    title: "The Depth",
    tagline: "Empathetic · Thoughtful · Soulful",
    description: `You don't do surface level. You want to know someone's 3am thoughts, their childhood wounds, and what they dream about. Small talk exhausts you — real connection energizes you.\n\nYou love deeply and expect the same in return. Being misunderstood is your greatest pain. When you find your person, you're the most loyal, attentive partner they'll ever have.\n\n*Your superpower:* You make people feel truly seen.\n*Your blind spot:* You sometimes over-analyze and miss the moment.`,
    ideal_match: "You need someone emotionally intelligent — someone who isn't afraid of depth.",
    blink_hook: `🌊 The right person is out there — someone who goes deep, not just wide.\nFind them on Blink.`,
  },
  free: {
    emoji: "🌟",
    title: "The Free Spirit",
    tagline: "Independent · Adventurous · Authentic",
    description: `You love fiercely, but on your own terms. You need a partner, not a warden. Freedom isn't about avoiding commitment — it's about choosing it every single day.\n\nYou bring excitement and fresh perspectives to every relationship. You help partners grow. But you need someone who trusts you, not someone who clings.\n\n*Your superpower:* You make relationships feel alive and never stale.\n*Your blind spot:* You sometimes avoid vulnerability because it feels like a trap.`,
    ideal_match: "You need someone secure enough to give you space — and interesting enough to make you want to stay.",
    blink_hook: `🌟 Someone out there wants exactly what you offer — freedom AND connection.\nFind them on Blink.`,
  },
  anchor: {
    emoji: "🏡",
    title: "The Anchor",
    tagline: "Loyal · Steady · Devoted",
    description: `You are the person people feel safe with. In a world of uncertainty, you offer something rare: consistency. When you commit, you mean it completely.\n\nYou're not flashy about love — you show it through actions. Showing up. Remembering. Being there. Your partners always know where they stand with you.\n\n*Your superpower:* You make people feel truly secure.\n*Your blind spot:* You sometimes put others' needs so far above your own that you forget to ask for what you need.`,
    ideal_match: "You need someone who recognizes your devotion and doesn't take your steadiness for granted.",
    blink_hook: `🏡 Someone out there is looking for exactly the love you give — steady, real, and all-in.\nFind them on Blink.`,
  },
};

// ═══════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════
function initSession(userId) {
  sessions.set(userId, {
    step: 0,
    scores: { spark: 0, depth: 0, free: 0, anchor: 0 },
  });
}

function getResult(scores) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

function buildQuestionKeyboard(questionIndex) {
  const q = QUESTIONS[questionIndex];
  const kb = new InlineKeyboard();
  q.options.forEach((opt, i) => {
    kb.text(opt.label, `ans_${questionIndex}_${opt.type}`);
    kb.row();
  });
  return kb;
}

// ═══════════════════════════════════════
// /start — 开始测试
// ═══════════════════════════════════════
bot.command("start", async (ctx) => {
  const userId = ctx.from.id;
  initSession(userId);

  await ctx.reply(
    `💘 *Love Personality Test*\n\n` +
    `Discover your true love style in 10 questions.\n\n` +
    `No right or wrong answers — just pick what feels most like *you*.\n\n` +
    `Ready? Let's go! 👇`,
    { parse_mode: "Markdown" }
  );

  await sendQuestion(ctx, userId, 0);
});

bot.command("test", async (ctx) => {
  const userId = ctx.from.id;
  initSession(userId);
  await ctx.reply(
    `💘 *Love Personality Test*\n\nDiscover your love style in 10 questions.\nPick what feels most like *you* 👇`,
    { parse_mode: "Markdown" }
  );
  await sendQuestion(ctx, userId, 0);
});

// ═══════════════════════════════════════
// 发送题目
// ═══════════════════════════════════════
async function sendQuestion(ctx, userId, questionIndex) {
  const q = QUESTIONS[questionIndex];
  const kb = buildQuestionKeyboard(questionIndex);
  const progress = `▓`.repeat(questionIndex) + `░`.repeat(10 - questionIndex);

  await ctx.reply(
    `${progress} ${questionIndex}/10\n\n${q.text}`,
    { parse_mode: "Markdown", reply_markup: kb }
  );
}

// ═══════════════════════════════════════
// 答题回调
// ═══════════════════════════════════════
bot.callbackQuery(/^ans_(\d+)_(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const questionIndex = Number(ctx.match[1]);
  const answerType = ctx.match[2];

  const session = sessions.get(userId);
  if (!session) {
    return ctx.reply("Session expired. Send /start to begin again.");
  }

  // 防止重复答题
  if (session.step !== questionIndex) return;

  // 记分
  session.scores[answerType]++;
  session.step++;

  // 把已答题目的按钮变成已选状态
  const selectedOption = QUESTIONS[questionIndex].options.find(o => o.type === answerType);
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.editMessageText(
      `✅ *Q${questionIndex + 1}:* ${selectedOption.label}`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {}

  // 下一题或出结果
  if (session.step < QUESTIONS.length) {
    await sendQuestion(ctx, userId, session.step);
  } else {
    await showResult(ctx, userId, session.scores);
  }
});

// ═══════════════════════════════════════
// 显示结果
// ═══════════════════════════════════════
async function showResult(ctx, userId, scores) {
  const resultKey = getResult(scores);
  const result = RESULTS[resultKey];

  // 计算各类型百分比
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const pct = (type) => Math.round((scores[type] / total) * 100);

  const scoreBar =
    `🔥 Spark ${pct("spark")}%  ` +
    `🌊 Depth ${pct("depth")}%\n` +
    `🌟 Free ${pct("free")}%  ` +
    `🏡 Anchor ${pct("anchor")}%`;

  const msg =
    `${result.emoji} *You are: ${result.title}*\n` +
    `_${result.tagline}_\n\n` +
    `${result.description}\n\n` +
    `💡 *Your ideal match:*\n${result.ideal_match}\n\n` +
    `${scoreBar}\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `${result.blink_hook}`;

  const kb = new InlineKeyboard()
    .url(`💘 Find my match on Blink`, `${BLINK_URL}?start=lovetest_${resultKey}`)
    .row()
    .text("🔄 Take the test again", "restart")
    .row()
    .text("📤 Share with a friend", `share_${resultKey}`);

  await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
  sessions.delete(userId);
}

// ═══════════════════════════════════════
// 重新测试
// ═══════════════════════════════════════
bot.callbackQuery("restart", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Starting over! 💘" });
  const userId = ctx.from.id;
  initSession(userId);
  await ctx.reply(
    `💘 *Let's go again!*\n\nPick what feels most like *you* 👇`,
    { parse_mode: "Markdown" }
  );
  await sendQuestion(ctx, userId, 0);
});

// ═══════════════════════════════════════
// 分享按钮
// ═══════════════════════════════════════
bot.callbackQuery(/^share_(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const resultKey = ctx.match[1];
  const result = RESULTS[resultKey];

  const botInfo = await bot.api.getMe();
  const shareText =
    `${result.emoji} I just took the Love Personality Test!\n\n` +
    `I'm *${result.title}* — ${result.tagline}\n\n` +
    `What's your love type? Take the test 👇\n` +
    `t.me/${botInfo.username}?start=test`;

  await ctx.reply(
    `📤 *Share this with your friends:*\n\n${shareText}\n\n` +
    `_(Copy and send the message above!)_`,
    { parse_mode: "Markdown" }
  );
});

// ═══════════════════════════════════════
// /help
// ═══════════════════════════════════════
bot.command("help", async (ctx) => {
  await ctx.reply(
    `💘 *Love Personality Test Bot*\n\n` +
    `/start or /test — Take the test\n\n` +
    `10 questions · 4 love types · Takes ~2 minutes\n\n` +
    `Discover if you're a 🔥 Spark, 🌊 Depth, 🌟 Free Spirit, or 🏡 Anchor`,
    { parse_mode: "Markdown" }
  );
});

// ═══════════════════════════════════════
// 启动
// ═══════════════════════════════════════
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error for update ${ctx.update.update_id}:`, err.error.message);
  });

console.log("💘 Love Test Bot 启动中...");
bot.start({
  onStart: (info) => console.log(`✅ 已启动: @${info.username}\n私信 /start 开始测试！`),
});