import { COMMANDS } from '../../config/constants.js';

/**
 * /help command - Show all available commands
 */
export const helpCommand = async (ctx) => {
  const isAdmin = ctx.user && (ctx.user.role === 'admin' || ctx.user.role === 'dev');
  
  let message = '📚 *Comandos Disponibles*\n\n';
  
  // User commands
  message += '*👤 Comandos de Usuario:*\n';
  COMMANDS.USER.forEach(cmd => {
    message += `/${cmd.command} - ${cmd.description}\n`;
  });
  
  // Admin commands (only show to admins)
  if (isAdmin) {
    message += '\n*👑 Comandos de Administrador:*\n';
    COMMANDS.ADMIN.forEach(cmd => {
      message += `/${cmd.command} - ${cmd.description}\n`;
    });
  }
  
  message += '\n💡 *Tip:* Usa los comandos sin parámetros para ver ejemplos de uso.';
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
};

export default helpCommand;
