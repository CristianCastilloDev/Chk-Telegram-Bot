/**
 * /creditos command - Check credit balance
 */
export const creditosCommand = async (ctx) => {
  const user = ctx.user;
  
  if (!user) {
    return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
  }
  
  const role = user.role || 'client';
  const isAdminOrDev = role === 'admin' || role === 'dev';
  
  let message = `💰 *Tu Balance de Créditos*\n\n`;
  
  // For admin/dev show unlimited
  if (isAdminOrDev) {
    const roleEmoji = role === 'dev' ? '⚙️' : '👑';
    const roleText = role === 'dev' ? 'Developer' : 'Administrador';
    
    message += `${roleEmoji} Rol: *${roleText}*\n`;
    message += `💳 Créditos: *♾️ Ilimitados*\n`;
    message += `\n✨ Como ${roleText}, tienes acceso ilimitado a todas las funciones.`;
  } else {
    // For regular users
    const credits = user.credits || 0;
    const planType = user.plan?.type || 'free';
    const planCredits = user.plan?.creditsPerMonth || 0;
    
    message += `💳 Créditos actuales: *${credits}*\n`;
    message += `📋 Plan: *${planType.toUpperCase()}*\n`;
    
    if (planType !== 'free' && planType !== 'lifetime') {
      const endDate = user.plan?.endDate?.toDate();
      if (endDate) {
        const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
        message += `📅 Créditos mensuales: ${planCredits}\n`;
        message += `⏰ Días restantes: ${daysLeft}\n`;
      }
    }
    
    if (planType === 'lifetime') {
      message += `♾️ Créditos ilimitados\n`;
    }
    
    message += `\n💡 Cada verificación de tarjeta cuesta 1 crédito.`;
    
    if (credits < 10 && planType !== 'lifetime') {
      message += `\n\n⚠️ *Créditos bajos!* Considera mejorar tu plan.`;
    }
  }
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
};

export default creditosCommand;
