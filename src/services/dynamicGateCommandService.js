import { getAllGates } from './gateService.js';
import logger from '../middleware/logger.js';

/**
 * Dynamic Gate Commands Service
 * Automatically registers Telegram commands for active gates
 */

class DynamicGateCommandService {
    constructor(bot) {
        this.bot = bot;
        this.registeredCommands = new Map();
    }

    /**
     * Register all active gate commands
     */
    async registerGateCommands(requireAuth, cooldownMiddleware, BOT_CONFIG) {
        try {
            logger.info('🔄 Loading dynamic gate commands...');

            const gates = await getAllGates();
            const activeGates = gates.filter(g =>
                g.status === 'active' &&
                g.command &&
                g.command.trim() !== ''
            );

            if (activeGates.length === 0) {
                logger.warn('⚠️ No gates with commands found');
                return;
            }

            // Register each gate command
            for (const gate of activeGates) {
                await this.registerGateCommand(gate, requireAuth, cooldownMiddleware, BOT_CONFIG);
            }

            logger.info(`✅ Registered ${this.registeredCommands.size} dynamic gate commands`);

            // Log registered commands
            this.registeredCommands.forEach((gateName, command) => {
                logger.info(`   /${command} → ${gateName}`);
            });

        } catch (error) {
            logger.error('❌ Error registering dynamic gate commands:', error);
        }
    }

    /**
     * Register a single gate command
     */
    async registerGateCommand(gate, requireAuth, cooldownMiddleware, BOT_CONFIG) {
        const command = gate.command.toLowerCase().trim();

        // Validate command format (alphanumeric only)
        if (!/^[a-z0-9]+$/.test(command)) {
            logger.warn(`⚠️ Invalid command format for gate ${gate.name}: ${command}`);
            return;
        }

        // Check for duplicates
        if (this.registeredCommands.has(command)) {
            logger.warn(`⚠️ Duplicate command detected: /${command} (${gate.name})`);
            return;
        }

        // Register the command with auth and cooldown
        this.bot.command(
            command,
            requireAuth,
            cooldownMiddleware(BOT_CONFIG.COOLDOWNS.CHECK),
            async (ctx) => {
                await this.handleGateCommand(ctx, gate);
            }
        );

        this.registeredCommands.set(command, gate.name);
    }

    /**
     * Handle gate command execution
     */
    async handleGateCommand(ctx, gate) {
        try {
            const args = ctx.message.text.split(' ').slice(1);
            const cardData = args[0];

            if (!cardData) {
                return ctx.reply(
                    `❌ *Uso incorrecto*\n\n` +
                    `Formato: \`/${gate.command} cc|mm|yy|cvv\`\n\n` +
                    `Ejemplo:\n` +
                    `\`/${gate.command} 4111111111111111|12|2026|000\`\n\n` +
                    `📌 *Gate:* ${gate.name}\n` +
                    `💰 *Tipo:* ${gate.type}\n` +
                    `ℹ️ ${gate.description || 'Sin descripción'}`,
                    { parse_mode: 'Markdown' }
                );
            }

            // Validate card format
            const cardParts = cardData.split('|');
            if (cardParts.length !== 4) {
                return ctx.reply(
                    `❌ *Formato inválido*\n\n` +
                    `Usa: \`cc|mm|yy|cvv\`\n` +
                    `Ejemplo: \`4111111111111111|12|2026|000\``,
                    { parse_mode: 'Markdown' }
                );
            }

            const [cc, mm, yy, cvv] = cardParts;

            // Basic validation
            if (cc.length < 13 || cc.length > 19) {
                return ctx.reply('❌ Número de tarjeta inválido (debe tener 13-19 dígitos)');
            }

            if (mm.length !== 2 || parseInt(mm) < 1 || parseInt(mm) > 12) {
                return ctx.reply('❌ Mes inválido (debe ser 01-12)');
            }

            if (yy.length !== 2 && yy.length !== 4) {
                return ctx.reply('❌ Año inválido (debe ser YY o YYYY)');
            }

            if (cvv.length < 3 || cvv.length > 4) {
                return ctx.reply('❌ CVV inválido (debe tener 3-4 dígitos)');
            }

            // Send processing message
            const processingMsg = await ctx.reply(
                `⏳ *Procesando...*\n\n` +
                `🎯 *Gate:* ${gate.name}\n` +
                `💳 *Card:* ${cc.slice(0, 6)}******${cc.slice(-4)}\n` +
                `📅 *Exp:* ${mm}/${yy}\n` +
                `🔐 *CVV:* ${'*'.repeat(cvv.length)}`,
                { parse_mode: 'Markdown' }
            );

            // TODO: Implement actual gate checking logic here
            // For now, simulate a response
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Simulate result (replace with actual gate checking)
            const isLive = Math.random() > 0.5; // Random for demo

            if (isLive) {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `✅ *APPROVED*\n\n` +
                    `🎯 *Gate:* ${gate.name}\n` +
                    `💳 *Card:* ${cc.slice(0, 6)}******${cc.slice(-4)}\n` +
                    `📅 *Exp:* ${mm}/${yy}\n` +
                    `🔐 *CVV:* ${'*'.repeat(cvv.length)}\n\n` +
                    `💰 *Response:* ${gate.description || 'Transaction approved'}\n` +
                    `⚡ *Type:* ${gate.type.toUpperCase()}\n` +
                    `📊 *Category:* ${gate.category || 'N/A'}`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `❌ *DECLINED*\n\n` +
                    `🎯 *Gate:* ${gate.name}\n` +
                    `💳 *Card:* ${cc.slice(0, 6)}******${cc.slice(-4)}\n` +
                    `📅 *Exp:* ${mm}/${yy}\n\n` +
                    `💬 *Response:* Card declined\n` +
                    `⚡ *Type:* ${gate.type.toUpperCase()}`,
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            logger.error(`Error in gate command /${gate.command}:`, error);
            await ctx.reply('❌ Error al procesar la tarjeta. Intenta nuevamente.');
        }
    }

    /**
     * Get list of registered commands
     */
    getRegisteredCommands() {
        return Array.from(this.registeredCommands.entries()).map(([command, gateName]) => ({
            command,
            gateName
        }));
    }

    /**
     * Reload commands (useful for updates)
     */
    async reloadCommands(requireAuth, cooldownMiddleware, BOT_CONFIG) {
        this.registeredCommands.clear();
        await this.registerGateCommands(requireAuth, cooldownMiddleware, BOT_CONFIG);
    }
}

export default DynamicGateCommandService;
