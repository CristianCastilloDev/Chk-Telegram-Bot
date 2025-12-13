import { approveOrder } from '../../services/orderService.js';

/**
 * /approve command - Approve order (dev only)
 * Format: /approve <order_id>
 */
export const approveCommand = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    return ctx.reply(
      `✅ *Aprobar Orden*\n\n` +
      `*Formato:* \`/approve <order_id>\`\n` +
      `*Ejemplo:* \`/approve abc123def456\`\n\n` +
      `Usa \`/orders pending\` para ver órdenes pendientes.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  const orderId = args[0];
  
  try {
    const processingMsg = await ctx.reply('⏳ Procesando aprobación...');
    
    const result = await approveOrder(orderId, ctx.user.name || ctx.user.email);
    
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    
    const emoji = result.order.type === 'credits' ? '💳' : '📅';
    
    await ctx.reply(
      `✅ *Orden Aprobada Exitosamente*\n\n` +
      `📦 ID: \`${orderId}\`\n` +
      `${emoji} Tipo: ${result.order.type === 'credits' ? 'Créditos' : 'Plan'}\n` +
      `👤 Usuario: ${result.order.targetUser}\n` +
      `📊 Cantidad: ${result.order.amount} ${result.order.type === 'credits' ? 'créditos' : 'días'}\n` +
      `💵 Precio: $${result.order.price}\n\n` +
      `✨ Los cambios han sido aplicados al usuario.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Error in approve command:', error);
    await ctx.reply(`❌ Error al aprobar orden: ${error.message}`);
  }
};

export default approveCommand;
