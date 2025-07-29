const { addUser } = require('./storage');
const dotenv = require('dotenv');
dotenv.config();

module.exports = function handleUser(ctx, bot) {
  const user = ctx.from;

  // Foydalanuvchi bazaga qo‘shiladi
  addUser({
    id: user.id,
    first_name: user.first_name || '',
    username: user.username || '',
  });

  ctx.reply(`Salom ${user.first_name || 'foydalanuvchi'}! Yordam uchun bu yerga yozishingiz mumkin.`);

  // Adminni xabardor qilish
  bot.telegram.sendMessage(process.env.ADMIN_ID, `🆕 Yangi foydalanuvchi:\n👤 <a href="tg://user?id=${user.id}">${user.first_name}</a>\n🆔 ID: ${user.id}`, { parse_mode: 'HTML' });
}
