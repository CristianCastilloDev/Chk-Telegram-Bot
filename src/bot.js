import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import logger from './middleware/logger.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware, requireAuth, requireAdmin } from './middleware/auth.js';
import { rateLimitMiddleware, cooldownMiddleware } from './middleware/rateLimit.js';
import { BOT_CONFIG } from './config/constants.js';

// Import services
import PasswordChangeService from './services/passwordChangeService.js';
import OrderNotificationService from './services/orderNotificationService.js';
import RegistrationService from './services/registrationService.js';
import PasswordResetService from './services/passwordResetService.js';
import PasswordUpdateService from './services/passwordUpdateService.js';
import OrderConfirmationService from './services/orderConfirmationService.js';

// Import handlers
import { handleApproveCallback, handleRejectCallback } from './handlers/orderCallbacks.js';
import { handleConfirmRegistration, handleCancelRegistration } from './handlers/registrationCallbacks.js';
import { handleConfirmReset, handleCancelReset } from './handlers/passwordResetCallbacks.js';
import { handleGatesMenu, handleToolsMenu, handleDevMenu, handleBackToStart } from './handlers/menuCallbacks.js';
import { handleBuyPlan, handleAcceptPurchaseOrder, handleApprovePayment, handleRejectPayment } from './handlers/purchaseOrderCallbacks.js';
import { handlePaymentProofPhoto } from './handlers/paymentProofHandler.js';
import { handleConfirmReceived, handleConfirmNotReceived } from './handlers/confirmationCallbacks.js';

// Import commands
import startCommand from './commands/user/start.js';
import helpCommand from './commands/user/help.js';
import creditosCommand from './commands/user/creditos.js';
import planCommand from './commands/user/plan.js';
import checkCommand from './commands/user/check.js';
import mylivesCommand from './commands/user/mylives.js';
import binCommand from './commands/user/bin.js';
import buyCommand from './commands/user/buy.js';
import capturaPagoCommand from './commands/user/capturapago.js';
import misordenesCommand from './commands/user/misordenes.js';

// Import admin commands
import usersCommand from './commands/admin/users.js';
import addCreditsCommand from './commands/admin/addCredits.js';
import setPlanCommand from './commands/admin/setplan.js';
import gananciasCommand from './commands/admin/ganancias.js';
import { bancaCommand, setBancaCommand } from './commands/admin/banca.js';
import ordersCommand from './commands/admin/orders.js';
import approveCommand from './commands/admin/approve.js';
import rejectCommand from './commands/admin/reject.js';
import statsCommand from './commands/admin/stats.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

if (!process.env.FIREBASE_PROJECT_ID) {
  logger.error('Firebase configuration is not set in environment variables');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

logger.info(`Starting ${BOT_CONFIG.NAME} v${BOT_CONFIG.VERSION}`);

// Initialize services
const passwordChangeService = new PasswordChangeService(bot);
const orderNotificationService = new OrderNotificationService(bot);
const registrationService = new RegistrationService(bot);
const passwordResetService = new PasswordResetService(bot);
const passwordUpdateService = new PasswordUpdateService();
const orderConfirmationService = new OrderConfirmationService(bot);

// ========== MIDDLEWARE ==========

// Error handler (must be first)
bot.use(errorHandler);

// Logger
bot.use(loggerMiddleware);

// Rate limiting
bot.use(rateLimitMiddleware);

// Authentication (attaches user data to context)
bot.use(authMiddleware);

// ========== COMMANDS ==========

// Public commands (no auth required)
bot.command('start', startCommand);
bot.command('help', helpCommand);

// User commands (auth required)
bot.command('creditos', requireAuth, creditosCommand);
bot.command('plan', requireAuth, planCommand);
bot.command('mylives', requireAuth, mylivesCommand);
bot.command('bin', requireAuth, cooldownMiddleware(BOT_CONFIG.COOLDOWNS.BIN), binCommand);
bot.command('buy', requireAuth, buyCommand);
bot.command('capturapago', requireAuth, capturaPagoCommand);
bot.command('misordenes', requireAuth, misordenesCommand);

// Gate commands (auth required + cooldown)
bot.command('check', requireAuth, cooldownMiddleware(BOT_CONFIG.COOLDOWNS.CHECK), checkCommand);

// Admin commands (admin/dev only)
bot.command('users', requireAuth, requireAdmin, usersCommand);
bot.command('addcredits', requireAuth, requireAdmin, addCreditsCommand);
bot.command('setplan', requireAuth, requireAdmin, setPlanCommand);
bot.command('ganancias', requireAuth, gananciasCommand); // Available for admin and dev
bot.command('banca', requireAuth, bancaCommand); // Owner only (TODO: add owner check)
bot.command('setbanca', requireAuth, setBancaCommand); // Owner only (TODO: add owner check)
bot.command('stats', requireAuth, requireAdmin, statsCommand);

// Order management commands (dev only)
bot.command('orders', requireAuth, requireAdmin, ordersCommand);
bot.command('approve', requireAuth, requireAdmin, approveCommand);
bot.command('reject', requireAuth, requireAdmin, rejectCommand);

// Callback query handlers for inline buttons (legacy analytics_orders)
bot.action(/^approve_order_/, requireAuth, requireAdmin, handleApproveCallback);
bot.action(/^reject_/, requireAuth, requireAdmin, handleRejectCallback);

// Registration callback handlers (no auth required for new users)
bot.action(/^confirm_reg_/, handleConfirmRegistration);
bot.action(/^cancel_reg_/, handleCancelRegistration);

// Password reset callback handlers (no auth required)
bot.action(/^confirm_reset_/, handleConfirmReset);
bot.action(/^cancel_reset_/, handleCancelReset);

// Menu callback handlers (auth required)
bot.action('menu_gates', requireAuth, handleGatesMenu);
bot.action('menu_tools', requireAuth, handleToolsMenu);
bot.action('menu_dev', requireAuth, handleDevMenu);
bot.action('back_to_start', requireAuth, handleBackToStart);

// Purchase order callbacks
bot.action(/^buy_/, requireAuth, handleBuyPlan);
bot.action(/^accept_purchase_/, requireAuth, handleAcceptPurchaseOrder);
bot.action(/^approve_payment_/, requireAuth, handleApprovePayment);
bot.action(/^reject_payment_/, requireAuth, handleRejectPayment);

// Photo handler for payment proofs
bot.on('photo', requireAuth, handlePaymentProofPhoto);

// Confirmation callbacks
bot.action(/^confirm_received_/, requireAuth, handleConfirmReceived);
bot.action(/^confirm_not_received_/, requireAuth, handleConfirmNotReceived);

// ========== BOT LAUNCH ==========

// Handle graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop services
    passwordChangeService.stop();
    orderNotificationService.stop();
    registrationService.stop();
    passwordResetService.stop();
    passwordUpdateService.stop();
    orderConfirmationService.stop();

    await bot.stop(signal);
    logger.info('Bot stopped successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Start services before launching bot
console.log('🔧 Starting Password Change Service...');
try {
  passwordChangeService.start();
  console.log('✅ Password Change Service started successfully');
} catch (error) {
  console.error('❌ ERROR starting Password Change Service:', error);
}

console.log('📦 Starting Order Notification Service...');
try {
  orderNotificationService.start();
  console.log('✅ Order Notification Service started successfully');
} catch (error) {
  console.error('❌ ERROR starting Order Notification Service:', error);
}

console.log('📝 Starting Registration Service...');
try {
  registrationService.start();
  console.log('✅ Registration Service started successfully');
} catch (error) {
  console.error('❌ ERROR starting Registration Service:', error);
}

console.log('🔑 Starting Password Reset Service...');
try {
  passwordResetService.start();
  console.log('✅ Password Reset Service started successfully');
} catch (error) {
  console.error('❌ ERROR starting Password Reset Service:', error);
}

console.log('🔐 Starting Password Update Service...');
try {
  passwordUpdateService.start();
  console.log('✅ Password Update Service started successfully');
} catch (error) {
  console.error('❌ ERROR starting Password Update Service:', error);
}

console.log('✅ Starting Order Confirmation Service...');
try {
  orderConfirmationService.start();
  console.log('✅ Order Confirmation Service started successfully');
} catch (error) {
  console.error('❌ ERROR starting Order Confirmation Service:', error);
}

// Launch bot
console.log('🚀 Launching bot...');
bot.launch();

// Log success
setTimeout(() => {
  logger.info('✅ Bot is running!');
  console.log('✅ Bot is running and listening for messages');
}, 1000);

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

export default bot;
