const { getUser } = require('./storage');
const dotenv = require('dotenv');
dotenv.config();

const panels = {
  main: {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎁 Premium hadya qilish', callback_data: 'gift' }],
        [{ text: '🚫 Blocklash', callback_data: 'block' }],
        [{ text: '✅ Blockdan ochish', callback_data: 'unblock' }],
        [{ text: '🔙 Menyuga qaytish', callback_data: 'menu' }],
      ],
    },
  },
};

module.exports = function setupAdmin(bot) {
  const sessions = new Map();

  // ADMIN PANEL BOSILGANDA
  bot.action('panel', async (ctx) => {
    if (ctx.from.id.toString() !== process.env.ADMIN_ID) return;
    await ctx.editMessageText('🔧 Admin paneli:', panels.main);
  });

  bot.action('menu', async (ctx) => {
    if (ctx.from.id.toString() !== process.env.ADMIN_ID) return;
    await ctx.editMessageText('🔧 Admin paneli:', panels.main);
  });

  ['gift', 'block', 'unblock'].forEach(action => {
    bot.action(action, async (ctx) => {
      if (ctx.from.id.toString() !== process.env.ADMIN_ID) return;
      sessions.set(ctx.from.id, action);
      await ctx.reply(`Iltimos, foydalanuvchi ID sini kiriting:`);
    });
  });

  // TEXT KELGANDA
  bot.on('text', async (ctx, next) => {
    if (ctx.from.id.toString() !== process.env.ADMIN_ID) return next();

    const step = sessions.get(ctx.from.id);
    if (!step) return next();

    const userId = ctx.message.text.trim();

    const user = getUser(userId);
    if (!user) {
      return ctx.reply('❌ Foydalanuvchi topilmadi. Iltimos, to‘g‘ri ID kiriting:');
    }

    if (step === 'gift') {
      await bot.telegram.sendMessage(userId, `🎉 Sizga admin tomonidan Premium obuna hadya qilindi!`);
      await ctx.reply(`✅ Premium berildi: ${userId}`);
    }

    if (step === 'block') {
      await bot.telegram.sendMessage(userId, `🚫 Siz admin tomonidan bloklandingiz.`);
      await ctx.reply(`✅ Blocklandi: ${userId}`);
    }

    if (step === 'unblock') {
      await bot.telegram.sendMessage(userId, `✅ Siz blockdan chiqarildingiz.`);
      await ctx.reply(`✅ Blockdan ochildi: ${userId}`);
    }

    sessions.delete(ctx.from.id);
  });
};
