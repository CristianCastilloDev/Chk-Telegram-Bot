/**
 * /plan command - View active plan details
 */
export const planCommand = async (ctx) => {
  const user = ctx.user;

  if (!user) {
    return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
  }

  // Check if user is admin or dev
  const isAdminOrDev = user.role === 'admin' || user.role === 'dev';

  // Special display for admin/dev
  if (isAdminOrDev) {
    const roleDisplay = user.role === 'dev' ? 'Dev' : 'Admin';
    const roleEmoji = user.role === 'dev' ? '👨‍💻' : '👑';

    const message = `${roleEmoji} *Plan ${roleDisplay}*\n\n` +
      `💳 Créditos: Ilimitados\n` +
      `🔥 Acceso completo a todas las funciones\n` +
      `⭐ Sin restricciones\n` +
      `♾️ Sin renovaciones necesarias\n\n` +
      `💡 Como ${roleDisplay}, tienes acceso ilimitado al sistema.`;

    return ctx.reply(message, { parse_mode: 'Markdown' });
  }

  // Regular user plan display
  const plan = user.plan || { type: 'free' };
  const planType = plan.type || 'free';

  let message = `📋 *Tu Plan Actual*\n\n`;

  switch (planType) {
    case 'free':
      message += `🆓 *Plan Free*\n`;
      message += `💳 10 créditos iniciales\n`;
      message += `📅 Sin renovación automática\n\n`;
      message += `💡 Mejora tu plan para obtener más créditos mensuales.`;
      break;

    case 'monthly':
      message += `⭐ *Plan Monthly Pro*\n`;
      message += `💳 ${plan.creditsPerMonth || 100} créditos/mes\n`;
      const monthlyEnd = plan.endDate?.toDate();
      if (monthlyEnd) {
        const daysLeft = Math.ceil((monthlyEnd - new Date()) / (1000 * 60 * 60 * 24));
        message += `📅 Renovación: ${monthlyEnd.toLocaleDateString()}\n`;
        message += `⏰ Días restantes: ${daysLeft}\n`;
      }
      break;

    case 'annual':
      message += `🌟 *Plan Annual Pro*\n`;
      message += `💳 ${plan.creditsPerMonth || 100} créditos/mes\n`;
      const annualEnd = plan.endDate?.toDate();
      if (annualEnd) {
        const monthsLeft = Math.ceil((annualEnd - new Date()) / (1000 * 60 * 60 * 24 * 30));
        message += `📅 Renovación: ${annualEnd.toLocaleDateString()}\n`;
        message += `⏰ Meses restantes: ${monthsLeft}\n`;
      }
      message += `\n💰 Ahorro de 2 meses gratis al año`;
      break;

    case 'lifetime':
      message += `♾️ *Plan Lifetime*\n`;
      message += `💳 10,000 créditos de por vida\n`;
      message += `🔥 Sin renovaciones\n`;
      message += `⭐ Acceso ilimitado\n`;
      break;
  }

  const startDate = plan.startDate?.toDate();
  if (startDate) {
    message += `\n📆 Inicio: ${startDate.toLocaleDateString()}`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

export default planCommand;
