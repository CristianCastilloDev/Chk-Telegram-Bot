import { getOrders } from '../../services/orderService.js';

/**
 * /orders command - List orders (dev only)
 * Format: /orders [pending|approved|rejected|all]
 */
export const ordersCommand = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const filter = args[0] || 'pending'; // Default to pending
  
  const validFilters = ['pending', 'approved', 'rejected', 'all'];
  if (!validFilters.includes(filter)) {
    return ctx.reply(
      `📦 *Gestión de Órdenes*\n\n` +
      `*Formato:* \`/orders [filtro]\`\n\n` +
      `*Filtros disponibles:*\n` +
      `• \`pending\` - Órdenes pendientes (default)\n` +
      `• \`approved\` - Órdenes aprobadas\n` +
      `• \`rejected\` - Órdenes rechazadas\n` +
      `• \`all\` - Todas las órdenes\n\n` +
      `*Ejemplo:* \`/orders pending\``,
      { parse_mode: 'Markdown' }
    );
  }
  
  try {
    const orders = await getOrders(filter, 10);
    
    if (orders.length === 0) {
      return ctx.reply(`📭 No hay órdenes ${filter === 'all' ? '' : filter}.`);
    }
    
    let message = `📦 *Órdenes ${filter === 'all' ? 'Todas' : filter === 'pending' ? 'Pendientes' : filter === 'approved' ? 'Aprobadas' : 'Rechazadas'}* (${orders.length})\n\n`;
    
    orders.forEach((order, index) => {
      const emoji = order.type === 'credits' ? '💳' : '📅';
      const statusEmoji = order.status === 'pending' ? '⏳' : 
                         order.status === 'approved' ? '✅' : '❌';
      
      message += `${index + 1}. ${emoji} ${order.type === 'credits' ? 'Créditos' : 'Plan'} - ${order.targetUser}\n`;
      message += `   Admin: ${order.createdBy}\n`;
      message += `   Cantidad: ${order.amount} ${order.type === 'credits' ? 'créditos' : 'días'}\n`;
      message += `   Precio: $${order.price}\n`;
      message += `   Estado: ${statusEmoji} ${order.status}\n`;
      
      if (order.status === 'approved') {
        message += `   Aprobado por: ${order.approvedBy}\n`;
      } else if (order.status === 'rejected') {
        message += `   Rechazado por: ${order.rejectedBy}\n`;
        if (order.rejectionReason) {
          message += `   Razón: ${order.rejectionReason}\n`;
        }
      }
      
      message += `   ID: \`${order.id}\`\n\n`;
    });
    
    if (filter === 'pending' && orders.length > 0) {
      message += `\n💡 Usa \`/approve <ID>\` o \`/reject <ID>\` para gestionar`;
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in orders command:', error);
    await ctx.reply(`❌ Error al obtener órdenes: ${error.message}`);
  }
};

export default ordersCommand;
