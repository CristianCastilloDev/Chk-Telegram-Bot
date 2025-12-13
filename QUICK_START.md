# 🚀 Guía Rápida de Configuración

## 1️⃣ Crear Bot de Telegram

1. Abre Telegram y busca [@BotFather](https://t.me/BotFather)
2. Envía: `/newbot`
3. Sigue las instrucciones:
   - Nombre del bot: `Chk Bot` (o el que prefieras)
   - Username: `chk_checker_bot` (debe terminar en `_bot`)
4. **Guarda el token** que te da (ejemplo: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

## 2️⃣ Obtener Credenciales de Firebase

### Opción A: Desde Firebase Console (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto: **tu-proyecto-id**
3. Click en ⚙️ **Project Settings**
4. Ve a la pestaña **Service Accounts**
5. Click en **Generate New Private Key**
6. Se descargará un archivo JSON

### Opción B: Usar las credenciales existentes

Si ya tienes el archivo de service account, úsalo directamente.

## 3️⃣ Configurar Variables de Entorno

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Abre `.env` y completa:

```env
# Token del bot (del paso 1)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Del archivo JSON de Firebase:
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com

# La clave privada (importante: mantener los \n):
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE:**

- La clave privada debe estar entre comillas dobles
- Mantén los `\n` (saltos de línea) tal como están en el JSON
- NO compartas este archivo con nadie

## 4️⃣ Iniciar el Bot

```bash
# Modo desarrollo (recomendado para pruebas)
npm run dev

# Modo producción
npm start
```

Deberías ver:

```
✅ Bot started successfully!
Bot username: @tu_bot_username
```

## 5️⃣ Probar el Bot

1. Abre Telegram
2. Busca tu bot: `@tu_bot_username`
3. Envía: `/start`
4. El bot te responderá con tu Telegram ID

## 6️⃣ Vincular Cuenta

### Opción A: Desde la Web App (Próximamente)

1. Inicia sesión en la web app
2. Ve a **Configuración → Telegram**
3. Ingresa tu Telegram ID
4. Click en **Vincular**

### Opción B: Manual (Temporal)

Mientras implementamos la interfaz web, puedes vincular manualmente:

1. Obtén tu Telegram ID del bot (comando `/start`)
2. Obtén tu Firebase UID de la web app (en Configuración)
3. Agrega un documento en Firestore:
   - Colección: `telegram_users`
   - Campos:
     ```json
     {
       "telegramId": "123456789",
       "firebaseUid": "tu-firebase-uid",
       "username": "tu_username",
       "chatId": 123456789,
       "notifications": true,
       "linkedAt": "2024-01-01T00:00:00Z",
       "lastActive": "2024-01-01T00:00:00Z"
     }
     ```

## 7️⃣ Comandos de Prueba

Una vez vinculado, prueba:

```
/creditos    → Ver tu balance
/plan        → Ver tu plan
/bin 411111  → Consultar un BIN
/help        → Ver todos los comandos
```

## 🔧 Troubleshooting

### "Error: TELEGRAM_BOT_TOKEN is not set"

- Verifica que el archivo `.env` existe
- Verifica que el token esté correctamente copiado

### "Error initializing Firebase Admin SDK"

- Verifica que las credenciales de Firebase sean correctas
- Asegúrate de que la clave privada tenga los `\n`

### "Tu cuenta no está vinculada"

- Completa el paso 6 (Vincular Cuenta)
- Verifica que el Telegram ID sea correcto

### Bot no responde

- Verifica que el bot esté corriendo (`npm run dev`)
- Revisa los logs en la consola
- Verifica que el token sea válido

## 📝 Próximos Pasos

1. ✅ Configurar bot
2. ✅ Vincular cuenta
3. ⏳ Implementar interfaz de vinculación en web app
4. ⏳ Agregar comandos de admin
5. ⏳ Implementar notificaciones en tiempo real
6. ⏳ Agregar herramientas (email, sms, address)

## 🆘 Ayuda

Si tienes problemas, revisa:

- `logs/error.log` - Errores del bot
- `logs/combined.log` - Todos los logs
- README.md - Documentación completa

---

**¡Listo para empezar! 🚀**
