/**
 * Bot Configuration Constants
 */

export const BOT_CONFIG = {
  // Bot name and version
  NAME: 'Chk Bot',
  VERSION: '1.0.0',

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  },

  // Command cooldowns (in milliseconds)
  COOLDOWNS: {
    CHECK: 5000,      // 5 seconds between card checks
    BIN: 2000,        // 2 seconds between BIN lookups
    TOOLS: 3000,      // 3 seconds between tool requests
    DEFAULT: 1000,    // 1 second default cooldown
  },

  // Credits costs
  COSTS: {
    CHECK: 1,         // 1 credit per card check
    BIN: 0,           // Free BIN lookup
    EMAIL: 0,         // Free tools
    SMS: 0,
    ADDRESS: 0,
  },
};

/**
 * Available Plans for Purchase
 */
export const PLANS = {
  // Plans by Days
  DAYS: {
    ONE_DAY: {
      id: 'one_day',
      name: '1 Día',
      duration: 1,
      price: 30,
      currency: 'MXN',
      creditsPerDay: 10,
      type: 'days'
    },
    WEEKLY: {
      id: 'weekly',
      name: 'Semanal',
      duration: 7,
      price: 150,
      currency: 'MXN',
      creditsPerDay: 15,
      type: 'days'
    },
    BIWEEKLY: {
      id: 'biweekly',
      name: 'Quincenal',
      duration: 15,
      price: 250,
      currency: 'MXN',
      creditsPerDay: 20,
      type: 'days'
    },
    MONTHLY: {
      id: 'monthly',
      name: 'Mensual',
      duration: 30,
      price: 400,
      currency: 'MXN',
      creditsPerDay: 25,
      type: 'days'
    }
  },

  // Plans by Credits
  CREDITS: {
    PACK_100: {
      id: 'pack_100',
      name: 'Paquete 100',
      credits: 100,
      price: 50,
      currency: 'MXN',
      type: 'credits'
    },
    PACK_200: {
      id: 'pack_200',
      name: 'Paquete 200',
      credits: 200,
      price: 90,
      currency: 'MXN',
      type: 'credits'
    },
    PACK_500: {
      id: 'pack_500',
      name: 'Paquete 500',
      credits: 500,
      price: 200,
      currency: 'MXN',
      type: 'credits'
    },
    PACK_1000: {
      id: 'pack_1000',
      name: 'Paquete 1000',
      credits: 1000,
      price: 350,
      currency: 'MXN',
      type: 'credits'
    }
  }
};

/**
 * User Roles
 */
export const ROLES = {
  ADMIN: 'admin',
  DEV: 'dev',
  CLIENT: 'client',
};

/**
 * Command Categories
 */
export const COMMANDS = {
  USER: [
    { command: 'start', description: '🚀 Iniciar bot y vincular cuenta' },
    { command: 'creditos', description: '💰 Ver balance de créditos' },
    { command: 'plan', description: '📋 Ver plan activo' },
    { command: 'check', description: '💳 Verificar tarjeta (cc|mm|yy|cvv)' },
    { command: 'mylives', description: '✅ Ver mis tarjetas verificadas' },
    { command: 'bin', description: '🔍 Consultar BIN (6-8 dígitos)' },
    { command: 'gates', description: '🚪 Ver gates disponibles' },
    { command: 'email', description: '📧 Email temporal' },
    { command: 'sms', description: '📱 SMS temporal' },
    { command: 'address', description: '🏠 Dirección falsa' },
    { command: 'help', description: '❓ Ver todos los comandos' },
  ],
  ADMIN: [
    { command: 'users', description: '👥 Listar usuarios' },
    { command: 'addcredits', description: '➕ Agregar créditos (@user cantidad)' },
    { command: 'setplan', description: '📦 Asignar plan (@user plan)' },
    { command: 'orders', description: '🛒 Ver órdenes' },
    { command: 'stats', description: '📊 Estadísticas del sistema' },
    { command: 'broadcast', description: '📢 Mensaje a todos los usuarios' },
  ],
};

/**
 * Response Messages
 */
export const MESSAGES = {
  WELCOME: `
🎉 *¡Bienvenido a Chk Bot!*

Para empezar, necesitas vincular tu cuenta de Telegram con tu cuenta de Chk Web.

*¿Cómo vincular tu cuenta?*
1. Inicia sesión en https://proyecto-v1-0.vercel.app/
2. Ve a Configuración → Telegram
3. Ingresa tu Telegram ID: \`{telegramId}\`
4. Haz clic en "Vincular"

Una vez vinculada, podrás usar todos los comandos del bot.

Usa /help para ver todos los comandos disponibles.
  `,

  NOT_LINKED: '⚠️ Tu cuenta no está vinculada. Usa /start para ver cómo vincularla.',

  INSUFFICIENT_CREDITS: '❌ No tienes suficientes créditos. Usa /creditos para ver tu balance.',

  UNAUTHORIZED: '🔒 No tienes permisos para usar este comando.',

  ERROR: '❌ Ocurrió un error. Por favor, intenta de nuevo más tarde.',

  COOLDOWN: '⏳ Espera {seconds} segundos antes de usar este comando de nuevo.',
};

/**
 * Emojis
 */
export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  MONEY: '💰',
  CARD: '💳',
  LOCK: '🔒',
  UNLOCK: '🔓',
  FIRE: '🔥',
  STAR: '⭐',
  ROCKET: '🚀',
};

export default {
  BOT_CONFIG,
  ROLES,
  COMMANDS,
  MESSAGES,
  EMOJIS,
  PLANS,
};
