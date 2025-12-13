import { db } from '../../config/firebase.js';

/**
 * /stats command - System statistics (admin only)
 */
export const statsCommand = async (ctx) => {
  try {
    // Get total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Count by role
    let admins = 0;
    let devs = 0;
    let clients = 0;
    let totalCredits = 0;
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.role === 'admin') admins++;
      else if (user.role === 'dev') devs++;
      else clients++;
      totalCredits += user.credits || 0;
    });
    
    // Get total lives
    const livesSnapshot = await db.collection('lives').get();
    const totalLives = livesSnapshot.size;
    
    // Get lives today
    const today = new Date().toISOString().split('T')[0];
    const livesTodaySnapshot = await db.collection('lives')
      .where('date', '==', today)
      .get();
    const livesToday = livesTodaySnapshot.size;
    
    // Get total gates
    const gatesSnapshot = await db.collection('gates').get();
    const totalGates = gatesSnapshot.size;
    let activeGates = 0;
    
    gatesSnapshot.forEach(doc => {
      if (doc.data().status === 'active') activeGates++;
    });
    
    // Get telegram links
    const telegramSnapshot = await db.collection('telegram_users').get();
    const telegramLinks = telegramSnapshot.size;
    
    let message = `📊 *Estadísticas del Sistema*\n\n`;
    
    message += `👥 *Usuarios*\n`;
    message += `   Total: ${totalUsers}\n`;
    message += `   👑 Admins: ${admins}\n`;
    message += `   ⚙️ Devs: ${devs}\n`;
    message += `   👤 Clientes: ${clients}\n`;
    message += `   🤖 Vinculados a Telegram: ${telegramLinks}\n\n`;
    
    message += `💰 *Créditos*\n`;
    message += `   Total en sistema: ${totalCredits}\n`;
    message += `   Promedio por usuario: ${Math.round(totalCredits / totalUsers)}\n\n`;
    
    message += `✅ *Lives*\n`;
    message += `   Total: ${totalLives}\n`;
    message += `   Hoy: ${livesToday}\n\n`;
    
    message += `🚪 *Gates*\n`;
    message += `   Total: ${totalGates}\n`;
    message += `   Activos: ${activeGates}\n`;
    message += `   Inactivos: ${totalGates - activeGates}\n\n`;
    
    message += `📅 Fecha: ${new Date().toLocaleString('es-ES')}`;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in stats command:', error);
    await ctx.reply('❌ Error al obtener estadísticas.');
  }
};

export default statsCommand;
