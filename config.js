const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || "your_bot_username_here";
const BLINK_BOT = process.env.BLINK_BOT || "Blink_AImatch_Bot";
const BLINK_URL = process.env.BLINK_URL || `https://t.me/${BLINK_BOT}`;

if (!BOT_TOKEN) {
  // 在启动阶段就直接报错，避免以空 token 运行
  throw new Error("BOT_TOKEN is not set. Please configure it in environment variables.");
}

module.exports = {
  BOT_TOKEN,
  BOT_USERNAME,
  BLINK_BOT,
  BLINK_URL,
};

