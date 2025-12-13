import { db } from '../../config/firebase.js';

/**
 * /mylives command - View user's verified cards
 */
export const mylivesCommand = async (ctx) => {
  const user = ctx.user;
  
  if (!user) {
    return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
  }
  
  try {
    // Query user's lives from Firestore
    const livesSnapshot = await db.collection('lives')
      .where('userId', '==', user.uid)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    if (livesSnapshot.empty) {
      return ctx.reply(
        `📭 *No tienes tarjetas verificadas*\n\n` +
        `Usa /check para verificar tarjetas.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    let message = `✅ *Tus Últimas Tarjetas Verificadas*\n\n`;
    
    livesSnapshot.forEach((doc, index) => {
      const live = doc.data();
      const card = live.card || {};
      const cc = card.number || 'Unknown';
      const masked = `${cc.slice(0, 6)}******${cc.slice(-4)}`;
      const date = live.timestamp?.toDate().toLocaleDateString() || 'Unknown';
      
      message += `${index + 1}. 💳 \`${masked}\`\n`;
      message += `   📅 ${card.month}/${card.year}\n`;
      message += `   🏦 ${live.bank || 'Unknown'}\n`;
      message += `   🌍 ${live.country || 'Unknown'}\n`;
      message += `   🚪 ${live.gateName || 'Unknown'}\n`;
      message += `   📆 ${date}\n\n`;
    });
    
    const totalCount = livesSnapshot.size;
    message += `📊 Mostrando ${totalCount} de tus tarjetas más recientes.`;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in mylives command:', error);
    await ctx.reply('❌ Error al obtener tus tarjetas verificadas.');
  }
};

export default mylivesCommand;
