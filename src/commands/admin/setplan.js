import { db } from '../../config/firebase.js';
import { createOrder } from '../../services/orderService.js';

/**
 * /setplan command - Create order to assign plan to user (admin only)
 * Format: /setplan @username 30 25
 * or: /setplan email@example.com 30 25
 */
export const setPlanCommand = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length < 3) {
    return ctx.reply(
      `📅 *Asignar Plan*\n\n` +
      `*Formato:* \`/setplan @username días precio\`\n` +
      `*Ejemplo:* \`/setplan @usuario 30 25\`\n\n` +
      `También puedes usar el email:\n` +
      `\`/setplan user@email.com 30 25\`\n\n` +
      `📝 *Nota:* Esto creará una orden que debe ser aprobada por un Dev.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  const identifier = args[0].replace('@', ''); // Remove @ if present
  const days = parseInt(args[1]);
  const price = parseFloat(args[2]);
  
  if (isNaN(days) || days <= 0) {
    return ctx.reply('❌ Los días deben ser un número positivo.');
  }
  
  if (isNaN(price) || price <= 0) {
    return ctx.reply('❌ El precio debe ser un número positivo.');
  }
  
  try {
    // Find user by username or email
    let userDoc = null;
    let userEmail = null;
    let userName = null;
    
    // Try by username first
    const usernameQuery = await db.collection('users')
      .where('username', '==', identifier)
      .limit(1)
      .get();
    
    if (!usernameQuery.empty) {
      userDoc = usernameQuery.docs[0];
      const userData = userDoc.data();
      userEmail = userData.email;
      userName = userData.name || userData.username;
    } else {
      // Try by email
      const emailQuery = await db.collection('users')
        .where('email', '==', identifier)
        .limit(1)
        .get();
      
      if (!emailQuery.empty) {
        userDoc = emailQuery.docs[0];
        const userData = userDoc.data();
        userEmail = userData.email;
        userName = userData.name || userData.email;
      }
    }
    
    if (!userDoc) {
      return ctx.reply(`❌ Usuario no encontrado: ${identifier}`);
    }
    
    // Determine plan name
    const planName = days === 1 ? 'Plan Diario' :
                    days === 7 ? 'Plan Semanal' :
                    days === 30 ? 'Plan Mensual' :
                    `Plan de ${days} días`;
    
    // Create order
    const order = await createOrder({
      createdBy: ctx.user.name || ctx.user.email,
      targetUser: userName,
      targetUserEmail: userEmail,
      type: 'plan',
      description: `${planName} vía Telegram Bot`,
      amount: days,
      price: price
    });
    
    await ctx.reply(
      `✅ *Orden Creada Exitosamente*\n\n` +
      `📦 ID: \`${order.id}\`\n` +
      `👤 Usuario: ${userName}\n` +
      `📅 Plan: ${planName} (${days} días)\n` +
      `💵 Precio: $${price}\n` +
      `📋 Estado: Pendiente\n\n` +
      `⏳ La orden debe ser aprobada por un Dev.\n` +
      `Usa \`/orders pending\` para ver órdenes pendientes.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Error in setplan command:', error);
    await ctx.reply(`❌ Error al crear la orden: ${error.message}`);
  }
};

export default setPlanCommand;
