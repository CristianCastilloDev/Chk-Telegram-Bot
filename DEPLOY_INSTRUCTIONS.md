# 🚀 Instrucciones para Subir a GitHub y Deploy en Railway

## ✅ Archivos Preparados

Ya se crearon los siguientes archivos:

- ✅ `.gitignore` - Excluye archivos sensibles
- ✅ `README.md` - Documentación completa
- ✅ `.env.example` - Template de variables de entorno
- ✅ Git inicializado y primer commit hecho

## 📤 Paso 1: Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name:** `Chk-Telegram-Bot`
3. **Description:** Bot de Telegram con Firebase para gestión de usuarios
4. **Visibility:** ✅ Private (IMPORTANTE)
5. **NO** marques "Initialize this repository with..."
6. Click **Create repository**

## 🔗 Paso 2: Conectar y Subir

GitHub te mostrará comandos. Usa estos (ya están listos):

```bash
cd "h:\Proyectos Web\Chk-Web-Beta\Chk_Telegram_Bot"

# Agregar remote (reemplaza TU_USUARIO con tu username de GitHub)
git remote add origin https://github.com/TU_USUARIO/Chk-Telegram-Bot.git

# Renombrar rama a main (si es necesario)
git branch -M main

# Subir código
git push -u origin main
```

## 🚂 Paso 3: Deploy en Railway

### 3.1 Crear Cuenta en Railway

1. Ve a https://railway.app
2. Click **Login** → **Login with GitHub**
3. Autoriza Railway a acceder a tus repos

### 3.2 Crear Nuevo Proyecto

1. Click **New Project**
2. Selecciona **Deploy from GitHub repo**
3. Busca y selecciona `Chk-Telegram-Bot`
4. Railway detectará automáticamente que es Node.js

### 3.3 Configurar Variables de Entorno

En Railway, ve a tu proyecto → **Variables** → **RAW Editor** y pega:

```env
TELEGRAM_BOT_TOKEN=tu_bot_token_de_botfather
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
tu_clave_privada_completa_aqui
-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
NODE_ENV=production
```

⚠️ **IMPORTANTE para FIREBASE_PRIVATE_KEY:**

- Copia la clave COMPLETA desde tu archivo de credenciales de Firebase
- Incluye `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Mantén los saltos de línea (`\n`)

### 3.4 Deploy Automático

Railway automáticamente:

1. Detecta `package.json`
2. Ejecuta `npm install`
3. Ejecuta `npm start`
4. ¡Tu bot estará online 24/7! 🎉

## ✅ Verificar que Funciona

1. En Railway, ve a **Deployments** → verás el log del bot
2. Deberías ver mensajes como:
   ```
   ✅ Firebase Admin SDK initialized
   🤖 Bot started successfully
   🔑 Starting Password Reset Service...
   ```
3. Prueba enviando `/start` a tu bot en Telegram

## 🔧 Comandos Útiles

### Ver logs en Railway

```
Railway Dashboard → Tu Proyecto → Deployments → View Logs
```

### Actualizar código

```bash
git add .
git commit -m "Descripción de cambios"
git push
```

Railway automáticamente detectará el push y hará redeploy.

### Detener el bot

```
Railway Dashboard → Settings → Delete Service
```

## 🐛 Troubleshooting

### Bot no responde

- Verifica que las variables de entorno estén correctas
- Revisa los logs en Railway
- Asegúrate de que el `TELEGRAM_BOT_TOKEN` sea válido

### Error de Firebase

- Verifica que `FIREBASE_PRIVATE_KEY` tenga los saltos de línea
- Asegúrate de que el Service Account tenga permisos
- Revisa que Firestore esté habilitado

### Deploy falla

- Verifica que `package.json` tenga `"start": "node src/bot.js"`
- Revisa los logs de build en Railway
- Asegúrate de que todas las dependencias estén en `package.json`

## 💰 Costos

Railway ofrece:

- **$5 de crédito gratis mensual**
- Suficiente para un bot pequeño-mediano
- Si excedes, puedes agregar una tarjeta

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Asegúrate de que las reglas de Firestore estén actualizadas

---

**¡Listo para producción!** 🚀
