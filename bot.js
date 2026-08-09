
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// اتصال به دیتابیس (لینک MongoDB Cloud را اینجا قرار بده)
mongoose.connect(process.env.MONGO_URL);

// قرار دادن توکن جدید داخل این قسمت
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// مدل کاربر
const User = mongoose.model("User", {
  userId: Number,
  balance: { type: Number, default: 0 },
  cloudPower: { type: Number, default: 0.000001 }, // مقدار استخراج در هر ساعت
  lastMine: { type: Number, default: Date.now() }
});

// سیستم ماین ابری
async function cloudMining(user) {
  const now = Date.now();
  const hours = (now - user.lastMine) / (1000 * 60 * 60);

  if (hours >= 1) {
    user.balance += hours * user.cloudPower;
    user.lastMine = now;
    await user.save();
  }
}

// شروع ربات
bot.onText(/\/start/, async msg => {
  let user = await User.findOne({ userId: msg.from.id });

  if (!user) {
    user = new User({ userId: msg.from.id });
    await user.save();
  }

  await cloudMining(user);

  bot.sendMessage(msg.chat.id,
    `سلام ${msg.from.first_name} 🌙
ماینر ابری TON فعال شد.

🔹 موجودی فعلی: ${user.balance.toFixed(8)} TON
🔹 قدرت استخراج: ${user.cloudPower} TON/ساعت

برای برداشت: /withdraw`
  );
});

// برداشت TON
bot.onText(/\/withdraw/, async msg => {
  let user = await User.findOne({ userId: msg.from.id });
  await cloudMining(user);

  bot.sendMessage(msg.chat.id,
    `درخواست برداشت ثبت شد 🌐

🔹 مقدار قابل برداشت: ${user.balance.toFixed(8)} TON
🔹 لطفاً آدرس کیف پول TON خود را ارسال کنید.`
  );
});

// پنل مدیریت
bot.onText(/\/admin (.+)/, async (msg, match) => {
  if (msg.from.id !== 123456789) return; // آیدی مدیر

  const cmd = match[1];

  if (cmd === "users") {
    const users = await User.find();
    bot.sendMessage(msg.chat.id, `تعداد کاربران: ${users.length}`);
  }

  if (cmd.startsWith("power")) {
    const [_, id, amount] = cmd.split(" ");
    const user = await User.findOne({ userId: id });
    user.cloudPower = Number(amount);
    await user.save();
    bot.sendMessage(msg.chat.id, "قدرت استخراج آپدیت شد");
  }
});
