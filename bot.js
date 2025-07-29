require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const bot = new Telegraf(process.env.BOT_TOKEN);

let tempAction = {};
const USERS_FILE = './users.json';

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getUser(id) {
  return readUsers().find((u) => u.id === id);
}

function saveUser(user) {
  const users = readUsers();
  const exists = users.find((u) => u.id === user.id);
  if (!exists) {
    users.push({ ...user, premium: false, premiumUntil: null, blocked: false });
    writeUsers(users);
  }
}

function updateUser(id, updates) {
  const users = readUsers().map((u) =>
    u.id === id ? { ...u, ...updates } : u
  );
  writeUsers(users);
}

bot.start(async (ctx) => {
  const isAdmin = ctx.from.id.toString() === process.env.ADMIN_ID;

  if (isAdmin) {
    await ctx.reply('Hush kelibsiz admin! /panel ga o‘tish uchun tugmani bosing.', Markup.inlineKeyboard([
      Markup.button.callback('🛠 Panel', 'open_panel')
    ]));
  } else {
    const user = {
      id: ctx.from.id,
      name: ctx.from.first_name || 'No name',
      username: ctx.from.username || '',
    };
    saveUser(user);

    await ctx.reply(`Salom ${user.name}, hush kelibsiz!`);
    await bot.telegram.sendMessage(process.env.ADMIN_ID,
      `🆕 Yangi foydalanuvchi:\n👤 <a href="tg://user?id=${user.id}">${user.name}</a>\n🆔 ID: ${user.id}`,
      { parse_mode: 'HTML' }
    );
  }
});

bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  const isAdmin = userId.toString() === process.env.ADMIN_ID;

  if (isAdmin && ctx.message.reply_to_message) {
    const replyText = ctx.message.text || ctx.message.caption || '';
    const original = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
    const match = original.match(/🔒userId:(\d+)/);
    if (!match) return ctx.reply('❗ Foydalanuvchi ID topilmadi.');

    const targetUserId = match[1];
    try {
      if (ctx.message.photo) {
        await ctx.telegram.sendPhoto(targetUserId, ctx.message.photo.at(-1).file_id, { caption: replyText });
      } else if (ctx.message.video) {
        await ctx.telegram.sendVideo(targetUserId, ctx.message.video.file_id, { caption: replyText });
      } else if (ctx.message.document) {
        await ctx.telegram.sendDocument(targetUserId, ctx.message.document.file_id, { caption: replyText });
      } else {
        await ctx.telegram.sendMessage(targetUserId, replyText);
      }
      return ctx.reply('✅ Xabar foydalanuvchiga yuborildi.');
    } catch {
      return ctx.reply('❌ Xatolik yuz berdi.');
    }
  }

  const user = getUser(userId);
  if (!user || user.blocked) return;

  const label = user.premium ? '⭐ Premium foydalanuvchi' : '';
  let text = `📩 Xabar:\n👤 <a href="tg://user?id=${user.id}">${user.name}</a>\n🆔 ID: ${user.id} ${label}\n\n${ctx.message.text || ctx.message.caption || ''}\n🔒userId:${user.id}`;

  await bot.telegram.sendMessage(process.env.ADMIN_ID, text, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      Markup.button.url('👁 Profilni ko‘rish', `https://t.me/${user.username || 'user?id=' + user.id}`)
    ])
  });
});

bot.action('open_panel', async (ctx) => {
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [Markup.button.callback('🎁 Premium hadya qilish', 'gift')],
      [Markup.button.callback('🚫 Blocklash', 'block')],
      [Markup.button.callback('✅ Blockdan ochish', 'unblock')],
      [Markup.button.callback('🔙 Menyuga qaytish', 'back_to_menu')]
    ]
  });
});

bot.action('back_to_menu', async (ctx) => {
  await ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [Markup.button.callback('🛠 Panel', 'open_panel')]
    ]
  });
});

['gift', 'block', 'unblock'].forEach((action) => {
  bot.action(action, async (ctx) => {
    const label = { gift: 'premium hadya', block: 'bloklash', unblock: 'blokdan chiqarish' };
    tempAction[ctx.from.id] = { action };
    await ctx.reply(`🆔 Qaysi foydalanuvchini ${label[action]}ni istaysiz? User ID ni yuboring:`);
  });
});

bot.on('text', async (ctx) => {
  const adminId = parseInt(process.env.ADMIN_ID);
  const text = ctx.message.text;
  const senderId = ctx.from.id;

  if (!tempAction[senderId]) return;

  if (!tempAction[senderId].targetId) {
    const targetId = parseInt(text);
    const user = getUser(targetId);
    if (!user) return ctx.reply('❗ Bunday foydalanuvchi topilmadi. Iltimos, qayta ID yuboring.');

    tempAction[senderId].targetId = targetId;

    if (tempAction[senderId].action === 'gift') {
      return ctx.reply('⏱ Necha kunlik premium berilsin? Masalan: 7');
    }
  } else {
    const { action, targetId } = tempAction[senderId];
    const user = getUser(targetId);
    delete tempAction[senderId];

    if (action === 'gift') {
      const days = parseInt(text);
      const now = new Date();
      const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      updateUser(targetId, { premium: true, premiumUntil: until.toISOString() });

      await ctx.reply(`✅ ${user.name} foydalanuvchiga ${days} kunlik premium hadya qilindi.`);
      await bot.telegram.sendMessage(targetId, `🎁 Sizga ${days} kunlik premium obuna berildi!`);
    } else if (action === 'block') {
      updateUser(targetId, { blocked: true });
      await ctx.reply(`🚫 ${user.name} bloklandi.`);
      await bot.telegram.sendMessage(targetId, '⛔ Siz admin tomonidan bloklandingiz.');
    } else if (action === 'unblock') {
      updateUser(targetId, { blocked: false });
      await ctx.reply(`✅ ${user.name} blokdan chiqarildi.`);
      await bot.telegram.sendMessage(targetId, '✅ Sizning blok holatingiz olib tashlandi.');
    }
  }
});

// Cron job bilan har 1 daqiqada tekshiruvchi (node-cron bilan qo‘shishingiz mumkin)
setInterval(() => {
  const now = new Date();
  const users = readUsers();
  users.forEach(user => {
    if (user.premium && user.premiumUntil && new Date(user.premiumUntil) < now) {
      updateUser(user.id, { premium: false, premiumUntil: null });
      bot.telegram.sendMessage(user.id, '⚠️ Premium obunangiz muddati tugadi.');
    }
  });
}, 60000);

bot.launch();
console.log('🤖 Bot ishga tushdi!');
