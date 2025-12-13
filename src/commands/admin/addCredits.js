import { db } from '../../config/firebase.js';
import { createOrder } from '../../services/orderService.js';

/**
 * /addcredits command - Create order to add credits to user (admin only)
 * Format: /addcredits @username 100 50
 * or: /addcredits email@example.com 100 50
 */
export const addCreditsCommand = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length < 3) {
    return ctx.reply(
      `💰 *Agregar Créditos*\n\n` +
      `*Formato:* \`/addcredits @username cantidad precio\`\n` +
      `*Ejemplo:* \`/addcredits @usuario 100 50\`\n\n` +
      `También puedes usar el email:\n` +
      `\`/addcredits user@email.com 100 50\`\n\n` +
      `📝 *Nota:* Esto creará una orden que debe ser aprobada por un Dev.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  const identifier = args[0].replace('@', ''); // Remove @ if present
  const amount = parseInt(args[1]);
  const price = parseFloat(args[2]);
  
  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ La cantidad debe ser un número positivo.');
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
    
    // Create order
    const order = await createOrder({
      createdBy: ctx.user.name || ctx.user.email,
      targetUser: userName,
      targetUserEmail: userEmail,
      type: 'credits',
      description: `${amount} créditos vía Telegram Bot`,
      amount: amount,
      price: price
    });
    
    await ctx.reply(
      `✅ *Orden Creada Exitosamente*\n\n` +
      `📦 ID: \`${order.id}\`\n` +
      `👤 Usuario: ${userName}\n` +
      `💰 Créditos: ${amount}\n` +
      `💵 Precio: $${price}\n` +
      `📋 Estado: Pendiente\n\n` +
      `⏳ La orden debe ser aprobada por un Dev.\n` +
      `Usa \`/orders pending\` para ver órdenes pendientes.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Error in addcredits command:', error);
    await ctx.reply(`❌ Error al crear la orden: ${error.message}`);
  }
};

export default addCreditsCommand;
