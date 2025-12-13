import { db } from '../../config/firebase.js';

/**
 * /users command - List all users (admin only)
 */
export const usersCommand = async (ctx) => {
  try {
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    if (usersSnapshot.empty) {
      return ctx.reply('📭 No hay usuarios registrados.');
    }
    
    let message = '👥 *Usuarios del Sistema*\n\n';
    
    usersSnapshot.forEach((doc, index) => {
      const user = doc.data();
      const role = user.role === 'admin' ? '👑' : user.role === 'dev' ? '⚙️' : '👤';
      
      message += `${index + 1}. ${role} *${user.name || user.email}*\n`;
      message += `   📧 ${user.email}\n`;
      message += `   💰 Créditos: ${user.credits || 0}\n`;
      message += `   📋 Plan: ${user.plan?.type || 'free'}\n`;
      message += `   🆔 UID: \`${doc.id}\`\n\n`;
    });
    
    message += `📊 Total: ${usersSnapshot.size} usuarios (mostrando últimos 20)`;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in users command:', error);
    await ctx.reply('❌ Error al obtener usuarios.');
  }
};

export default usersCommand;
