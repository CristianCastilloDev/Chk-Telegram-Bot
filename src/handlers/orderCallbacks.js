import { approveOrder, rejectOrder } from '../services/orderService.js';

/**
 * Handle inline button callbacks for order approval/rejection
 */

/**
 * Handle approve button callback
 */
export const handleApproveCallback = async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const orderId = callbackData.replace('approve_', '');
    
    console.log('✅ Approve button clicked for order:', orderId);
    
    // Answer callback query immediately
    await ctx.answerCbQuery('⏳ Procesando aprobación...');
    
    // Approve the order
    const result = await approveOrder(orderId, ctx.user.name || ctx.user.email);
    
    // Update the message
    const emoji = result.order.type === 'credits' ? '💳' : '📅';
    const updatedMessage = `
✅ *Orden Aprobada*

${emoji} *Tipo:* ${result.order.type === 'credits' ? 'Créditos' : 'Plan'}
👤 *Usuario:* ${result.order.targetUser}
📊 *Cantidad:* ${result.order.amount} ${result.order.type === 'credits' ? 'créditos' : 'días'}
💵 *Precio:* $${result.order.price}
👨‍💼 *Creado por:* ${result.order.createdBy}

✨ *Aprobado por:* ${ctx.user.name || ctx.user.email}
📅 *Fecha:* ${new Date().toLocaleString('es-MX')}

🆔 \`${orderId}\`
    `.trim();
    
    // Edit message and remove buttons
    await ctx.editMessageText(updatedMessage, {
      parse_mode: 'Markdown'
    });
    
    console.log('✅ Order approved successfully via inline button');
    
  } catch (error) {
    console.error('Error handling approve callback:', error);
    await ctx.answerCbQuery('❌ Error al aprobar la orden: ' + error.message, { show_alert: true });
  }
};

/**
 * Handle reject button callback
 */
export const handleRejectCallback = async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const orderId = callbackData.replace('reject_', '');
    
    console.log('❌ Reject button clicked for order:', orderId);
    
    // Answer callback query immediately
    await ctx.answerCbQuery('⏳ Procesando rechazo...');
    
    // Reject the order with default reason
    const reason = 'Rechazado desde notificación de Telegram';
    const result = await rejectOrder(orderId, ctx.user.name || ctx.user.email, reason);
    
    // Update the message
    const emoji = result.order.type === 'credits' ? '💳' : '📅';
    const updatedMessage = `
❌ *Orden Rechazada*

${emoji} *Tipo:* ${result.order.type === 'credits' ? 'Créditos' : 'Plan'}
👤 *Usuario:* ${result.order.targetUser}
📊 *Cantidad:* ${result.order.amount} ${result.order.type === 'credits' ? 'créditos' : 'días'}
💵 *Precio:* $${result.order.price}
👨‍💼 *Creado por:* ${result.order.createdBy}

🚫 *Rechazado por:* ${ctx.user.name || ctx.user.email}
📝 *Razón:* ${reason}
📅 *Fecha:* ${new Date().toLocaleString('es-MX')}

🆔 \`${orderId}\`
    `.trim();
    
    // Edit message and remove buttons
    await ctx.editMessageText(updatedMessage, {
      parse_mode: 'Markdown'
    });
    
    console.log('❌ Order rejected successfully via inline button');
    
  } catch (error) {
    console.error('Error handling reject callback:', error);
    await ctx.answerCbQuery('❌ Error al rechazar la orden: ' + error.message, { show_alert: true });
  }
};

export default {
  handleApproveCallback,
  handleRejectCallback
};
