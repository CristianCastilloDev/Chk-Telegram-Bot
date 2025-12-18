import { db } from '../../config/firebase.js';

/**
 * /ganancias command - View earnings for admin/dev
 */
export const gananciasCommand = async (ctx) => {
    const user = ctx.user;

    if (!user) {
        return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
    }

    // Only admins and devs can view earnings
    if (user.role !== 'admin' && user.role !== 'dev') {
        return ctx.reply('❌ Este comando solo está disponible para administradores y desarrolladores.');
    }

    try {
        const sellerId = ctx.from.id.toString();

        // Get earnings document
        const earningsDoc = await db.collection('earnings').doc(sellerId).get();

        if (!earningsDoc.exists) {
            return ctx.reply(
                '💰 *Mis Ganancias*\n\n' +
                'Aún no tienes ventas registradas.\n\n' +
                'Tus comisiones aparecerán aquí cuando completes tu primera venta.',
                { parse_mode: 'Markdown' }
            );
        }

        const earnings = earningsDoc.data();
        const totals = earnings.totals || {};
        const monthly = earnings.monthly || {};

        // Get current month key
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonth = monthly[currentMonthKey] || { sales: 0, amount: 0, commission: 0 };

        // Build message
        let message = '💰 *Mis Ganancias*\n\n';

        // Total earnings
        message += '📊 *Resumen Total:*\n';
        message += `• Ventas: ${totals.totalSales || 0}\n`;
        message += `• Monto Total: $${totals.totalAmount || 0} MXN\n`;
        message += `• Comisiones Ganadas: $${totals.totalCommissions || 0} MXN\n`;
        message += `• Comisiones Pagadas: $${totals.paidCommissions || 0} MXN\n`;
        message += `• Comisiones Pendientes: $${totals.pendingCommissions || 0} MXN\n`;
        message += '\n';

        // Current month
        message += `📅 *Este Mes (${getMonthName(now.getMonth())} ${now.getFullYear()}):*\n`;
        message += `• Ventas: ${currentMonth.sales}\n`;
        message += `• Monto: $${currentMonth.amount} MXN\n`;
        message += `• Comisiones: $${currentMonth.commission} MXN\n`;
        message += '\n';

        // Last 3 months
        const monthKeys = Object.keys(monthly).sort().reverse().slice(0, 3);
        if (monthKeys.length > 1) {
            message += '📈 *Últimos Meses:*\n';
            monthKeys.forEach(key => {
                if (key !== currentMonthKey) {
                    const [year, month] = key.split('-');
                    const monthData = monthly[key];
                    message += `• ${getMonthName(parseInt(month) - 1)} ${year}: ${monthData.sales} ventas, $${monthData.commission} MXN\n`;
                }
            });
            message += '\n';
        }

        message += '──────────────────────\n';
        message += `💡 Rol: ${user.role === 'admin' ? 'Administrador' : 'Desarrollador'}\n`;
        message += `📅 Actualizado: ${earnings.lastUpdated?.toDate().toLocaleDateString('es-ES') || 'N/A'}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error fetching earnings:', error);
        await ctx.reply('❌ Error al obtener tus ganancias. Intenta de nuevo más tarde.');
    }
};

/**
 * Get month name in Spanish
 */
function getMonthName(monthIndex) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
}

export default gananciasCommand;
