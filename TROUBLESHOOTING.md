# 🔧 Guía de Solución - Bot No Encuentra Cuenta Vinculada

## Problema

El bot dice "Tu cuenta no está vinculada" aunque ya la vinculaste en la web.

## Causa Probable

El archivo `.env` del bot tiene un error en la configuración de Firebase, específicamente en la **clave privada**.

---

## ✅ Solución: Verificar y Corregir `.env`

### Paso 1: Abrir `.env` del Bot

Abre el archivo: `h:\Proyectos Web\Chk-Web-Beta\Chk_Telegram_Bot\.env`

### Paso 2: Verificar el Formato de FIREBASE_PRIVATE_KEY

La clave privada DEBE tener este formato EXACTO:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...(tu clave aquí)...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANTE:**

- ✅ DEBE estar entre comillas dobles `"`
- ✅ DEBE tener `\n` (barra invertida + n) para los saltos de línea
- ✅ NO debe tener saltos de línea reales (todo en una sola línea)
- ✅ Debe empezar con `-----BEGIN PRIVATE KEY-----\n`
- ✅ Debe terminar con `\n-----END PRIVATE KEY-----\n`

### Paso 3: Obtener la Clave Correcta

**Opción A: Desde el JSON de Firebase**

1. Ve a Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Se descarga un archivo JSON
4. Abre el JSON y busca el campo `"private_key"`
5. Copia TODO el valor (incluyendo `-----BEGIN...` y `-----END...`)
6. Pégalo en el `.env` entre comillas dobles

**Ejemplo del JSON:**

```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
}
```

**Cópialo así en el .env:**

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
```

### Paso 4: Verificar Otros Campos

Asegúrate de que también tengas:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
```

### Paso 5: Reiniciar el Bot

1. Detén el bot (Ctrl+C en la terminal)
2. Vuelve a iniciarlo: `npm run dev`
3. Deberías ver: `✅ Firebase Admin SDK initialized successfully`

---

## 🧪 Probar la Conexión

Una vez reiniciado el bot, ejecuta:

```bash
node debug-link.js
```

Deberías ver:

```
✅ Found 1 document(s):

Document ID: xxxxx
  Telegram ID: 1234567890
  Firebase UID: abc123...
  Username: tu_username
  Linked At: 2024-12-12...
```

Si ves esto, ¡la conexión funciona!

---

## 🔍 Verificación Rápida

Abre el `.env` y verifica que:

1. ❓ ¿La línea `FIREBASE_PRIVATE_KEY` empieza con `"`?
2. ❓ ¿Tiene `\n` (no saltos de línea reales)?
3. ❓ ¿Termina con `"`?
4. ❓ ¿No hay espacios al inicio o final?

---

## 📞 Si Sigue Sin Funcionar

Si después de corregir el `.env` sigue sin funcionar:

1. Verifica que el Telegram ID en la web coincida con el del bot
2. Revisa que las reglas de Firestore estén desplegadas
3. Confirma que el bot tenga acceso a Internet

---

**¿Necesitas ayuda para obtener la clave privada correcta?** Avísame y te guío paso a paso.
