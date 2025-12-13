# 🤖 CHK Telegram Bot

Bot de Telegram para gestión de usuarios, créditos, planes y verificación de cuentas integrado con Firebase.

## 🌟 Características

- ✅ **Registro verificado por Telegram** - Los usuarios confirman su registro desde Telegram
- 🔐 **Recuperación de contraseña** - Sistema de reset con confirmación por Telegram
- 💳 **Gestión de créditos y planes** - Administradores pueden asignar créditos y planes
- 📊 **Sistema de órdenes** - Notificaciones en tiempo real con botones inline
- 🔗 **Vinculación de cuentas** - Conecta cuentas web con Telegram
- 📸 **Importación de fotos de perfil** - Descarga automática de fotos de Telegram
- 🔔 **Cambio de contraseña** - Notificaciones cuando usuarios cambian su contraseña

## 🛠️ Tecnologías

- **Node.js** - Runtime
- **Telegraf** - Framework del bot de Telegram
- **Firebase Admin SDK** - Base de datos y autenticación
- **Firestore** - Base de datos en tiempo real

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta de Firebase con Firestore habilitado
- Bot Token de Telegram (obtener de [@BotFather](https://t.me/botfather))
- Credenciales de Firebase Admin SDK

## 🚀 Instalación Local

1. **Clonar el repositorio**

```bash
git clone https://github.com/CristianCastilloDev/Chk-Telegram-Bot
cd Chk_Telegram_Bot
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en la raíz:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=tu_bot_token_aqui

# Firebase Admin SDK
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu_private_key_aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com

# Opcional: Para desarrollo
NODE_ENV=development
```

4. **Ejecutar en desarrollo**

```bash
npm run dev
```

## 🌐 Deploy en Railway

### Paso 1: Preparar el proyecto

1. Asegúrate de que `.gitignore` excluye archivos sensibles
2. Sube el código a GitHub (repositorio privado recomendado)

### Paso 2: Configurar Railway

1. Ve a [Railway.app](https://railway.app)
2. Inicia sesión con GitHub
3. Click en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Elige tu repositorio `Chk-Telegram-Bot`

### Paso 3: Variables de Entorno

En Railway, ve a **Variables** y agrega:

```
TELEGRAM_BOT_TOKEN=tu_bot_token
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY=tu_private_key_completa
FIREBASE_CLIENT_EMAIL=tu_email_service_account
```

⚠️ **IMPORTANTE:** Para `FIREBASE_PRIVATE_KEY`, copia la clave completa incluyendo:

```
-----BEGIN PRIVATE KEY-----
...contenido...
-----END PRIVATE KEY-----
```

### Paso 4: Deploy

Railway detectará automáticamente `package.json` y ejecutará:

```bash
npm install
npm start
```

El bot estará online 24/7 🎉

## 📁 Estructura del Proyecto

```
Chk_Telegram_Bot/
├── src/
│   ├── bot.js                 # Punto de entrada principal
│   ├── commands/              # Comandos del bot
│   │   ├── user/             # Comandos de usuario
│   │   └── admin/            # Comandos de administrador
│   ├── handlers/             # Manejadores de callbacks
│   ├── services/             # Servicios (listeners, notificaciones)
│   ├── middleware/           # Middleware de autenticación
│   └── config/               # Configuración
├── .env                      # Variables de entorno (NO SUBIR)
├── .gitignore               # Archivos a ignorar
├── package.json             # Dependencias
└── README.md                # Este archivo
```

## 🔧 Comandos Disponibles

### Comandos de Usuario

- `/start` - Iniciar el bot y vincular cuenta
- `/creditos` - Ver créditos disponibles
- `/plan` - Ver plan actual

### Comandos de Administrador

- `/addcredits <usuario> <cantidad> <precio>` - Agregar créditos
- `/setplan <usuario> <días> <precio>` - Asignar plan
- `/orders [status]` - Ver órdenes
- `/approve <orderId>` - Aprobar orden
- `/reject <orderId> [razón]` - Rechazar orden

### Comandos de Developer

- `/stats` - Estadísticas del sistema
- `/users` - Listar usuarios

## 🔐 Seguridad

- ✅ Credenciales en variables de entorno
- ✅ Middleware de autenticación
- ✅ Roles de usuario (client, admin, dev)
- ✅ Validación de permisos por comando
- ✅ Firebase Admin SDK para operaciones seguras

## 📊 Colecciones de Firestore

- `users` - Datos de usuarios
- `telegram_users` - Vinculación Telegram ↔ Firebase
- `pending_registrations` - Registros pendientes de confirmación
- `pending_password_resets` - Resets de contraseña pendientes
- `pending_password_updates` - Actualizaciones de contraseña
- `pending_password_changes` - Cambios de contraseña desde web
- `analytics_orders` - Órdenes de créditos/planes

## 🐛 Troubleshooting

### El bot no responde

- Verifica que el `TELEGRAM_BOT_TOKEN` sea correcto
- Revisa los logs en Railway
- Asegúrate de que el bot esté corriendo

### Error de Firebase

- Verifica las credenciales de Firebase Admin SDK
- Asegúrate de que Firestore esté habilitado
- Revisa las reglas de seguridad de Firestore

### Listeners no funcionan

- Verifica las reglas de Firestore (deben permitir `request.auth == null` para Admin SDK)
- Revisa los logs para errores de permisos

## 📝 Reglas de Firestore

Las reglas de Firestore deben permitir acceso al Admin SDK. Ver archivos:

- `FIRESTORE_REGISTRATION_RULES.md`
- `FIRESTORE_PASSWORD_RECOVERY_RULES.md`
- `FIRESTORE_ORDERS_RULES.md`

## 🤝 Contribuir

Este es un proyecto privado. Para cambios:

1. Crea una rama nueva
2. Haz tus cambios
3. Crea un Pull Request

## 📄 Licencia

Privado - Todos los derechos reservados

## 👨‍💻 Autor

Cristian Castillo - [@CristianCastilloDev](https://github.com/CristianCastilloDev)

---

**¿Necesitas ayuda?** Contacta al equipo de desarrollo.
