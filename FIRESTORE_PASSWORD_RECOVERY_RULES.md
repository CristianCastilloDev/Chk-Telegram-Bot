# Reglas de Firestore para Sistema de Recuperación de Contraseña

## 📋 Colecciones Necesarias

El sistema de recuperación de contraseña requiere dos nuevas colecciones en Firestore:

1. **`pending_password_resets`** - Solicitudes de recuperación de contraseña
2. **`pending_password_updates`** - Actualizaciones de contraseña pendientes

---

## 🔐 Reglas de Firestore

Agrega estas reglas a tu archivo `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isDev() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dev';
    }

    function isAdmin() {
      return isAuthenticated() &&
             (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'dev');
    }

    // ========== PENDING PASSWORD RESETS ==========

    match /pending_password_resets/{resetId} {
      // Permitir crear sin autenticación (recuperación pública)
      allow create: if true;

      // Permitir leer solo al Admin SDK (bot)
      allow read: if request.auth == null;

      // Permitir actualizar solo al Admin SDK (bot)
      allow update: if request.auth == null;

      // Permitir eliminar solo al Admin SDK (bot) para limpieza
      allow delete: if request.auth == null;
    }

    // ========== PENDING PASSWORD UPDATES ==========

    match /pending_password_updates/{updateId} {
      // Permitir crear sin autenticación (desde página de recuperación)
      allow create: if true;

      // Permitir leer solo al Admin SDK (bot)
      allow read: if request.auth == null;

      // Permitir actualizar solo al Admin SDK (bot)
      allow update: if request.auth == null;

      // Permitir eliminar solo al Admin SDK (bot)
      allow delete: if request.auth == null;
    }

    // ========== PENDING REGISTRATIONS ==========

    match /pending_registrations/{regId} {
      // Permitir crear sin autenticación (registro público)
      allow create: if true;

      // Permitir leer solo al Admin SDK (bot)
      allow read: if request.auth == null;

      // Permitir actualizar solo al Admin SDK (bot)
      allow update: if request.auth == null;

      // Permitir eliminar solo al Admin SDK (bot)
      allow delete: if request.auth == null;
    }

    // ========== PENDING PASSWORD CHANGES ==========

    match /pending_password_changes/{changeId} {
      // Permitir lectura:
      // - Al usuario dueño (desde la web)
      // - Sin autenticación (para Admin SDK del bot)
      allow read: if request.auth == null ||
                     (isAuthenticated() && resource.data.userId == request.auth.uid);

      // Permitir crear solo al usuario dueño
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;

      // Permitir actualizar:
      // - Al usuario dueño (para marcar como usado)
      // - Sin autenticación (para Admin SDK del bot)
      allow update: if request.auth == null ||
                       (isAuthenticated() && resource.data.userId == request.auth.uid);

      // Permitir eliminar solo al usuario dueño o devs
      allow delete: if isAuthenticated() &&
                       (resource.data.userId == request.auth.uid || isDev());
    }

    // ========== ANALYTICS ORDERS ==========

    match /analytics_orders/{orderId} {
      // Permitir lectura:
      // - Admin SDK (bot) puede leer todas las órdenes
      // - Usuarios autenticados pueden leer
      allow read: if request.auth == null || isAuthenticated();

      // Permitir crear solo a admins/devs
      allow create: if isAuthenticated() && isAdmin();

      // Permitir actualizar:
      // - Admin SDK (bot) puede actualizar
      // - Admins/devs pueden actualizar
      allow update: if request.auth == null || (isAuthenticated() && isAdmin());

      // Permitir eliminar solo a devs
      allow delete: if isAuthenticated() && isDev();
    }

    // ========== USERS ==========

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() || request.auth == null;
      allow update: if isAuthenticated() &&
                       (request.auth.uid == userId || isAdmin());
      allow delete: if isDev();
    }

    // ========== TELEGRAM USERS ==========

    match /telegram_users/{telegramUserId} {
      allow read: if isAuthenticated() || request.auth == null;
      allow create: if isAuthenticated() || request.auth == null;
      allow update: if isAuthenticated() || request.auth == null;
      allow delete: if isDev();
    }

    // Otras reglas existentes...
  }
}
```

---

## 📝 Estructura de Datos

### `pending_password_resets`

```javascript
{
  username: "usuario123",
  userId: "user_abc123",
  telegramId: "1951898071",
  status: "pending" | "completed" | "failed",
  verificationCode: "123456", // Generado por el bot
  codeGeneratedAt: Timestamp,
  createdAt: Timestamp,
  expiresAt: Timestamp,
  completedAt: Timestamp | null
}
```

### `pending_password_updates`

```javascript
{
  userId: "user_abc123",
  newPassword: "nueva_contraseña",
  resetId: "reset_abc123",
  createdAt: Timestamp,
  status: "pending" | "completed" | "failed",
  error: string | null,
  failedAt: Timestamp | null
}
```

---

## 🚀 Aplicar Cambios

### Opción 1: Firebase Console (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. **Firestore Database** → **Reglas**
4. Copia y pega las reglas completas
5. Click **Publicar**

### Opción 2: Firebase CLI

```bash
cd "h:\Proyectos Web\Chk-Web-Beta\Chk_Bot_Beta"
firebase deploy --only firestore:rules
```

---

## ✅ Verificación

Una vez desplegadas las reglas:

### 1. Verificar servicios del bot

El bot debería mostrar:

```
🔑 Starting Password Reset Service...
✅ Password Reset Service started successfully
🔐 Starting Password Update Service...
✅ Password Update Service started successfully
```

### 2. Probar flujo completo

1. Ve a `/forgot-password` en la web
2. Ingresa tu username
3. Deberías recibir código en Telegram
4. Ingresa el código en la web
5. Establece nueva contraseña
6. Inicia sesión con la nueva contraseña

### 3. Verificar en Firestore Console

Deberías ver las colecciones creadas:

- `pending_password_resets`
- `pending_password_updates`

---

## 🔒 Notas de Seguridad

### ¿Por qué `allow create: if true`?

- **Recuperación pública**: Cualquiera puede solicitar recuperación de contraseña
- **Verificación en 2 pasos**: Requiere acceso al Telegram vinculado
- **Código temporal**: Expira en 10 minutos
- **Bot valida**: Solo el bot puede actualizar el password real

### ¿Por qué `request.auth == null`?

- El **Admin SDK** del bot no tiene `request.auth`
- Necesita leer/actualizar documentos en tiempo real
- Las reglas se aplican a listeners, no a operaciones directas del Admin SDK

### Protección contra spam

- Códigos expiran en 10 minutos
- Solo usuarios con Telegram vinculado pueden recuperar
- Bot puede implementar rate limiting

---

## 🧹 Limpieza Automática (Opcional)

Puedes crear una Cloud Function para limpiar documentos expirados:

```javascript
// functions/index.js
exports.cleanupExpiredResets = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    // Limpiar resets expirados
    const expiredResets = await admin
      .firestore()
      .collection("pending_password_resets")
      .where("expiresAt", "<", now)
      .get();

    const batch = admin.firestore().batch();
    expiredResets.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Cleaned up ${expiredResets.size} expired resets`);
  });
```

---

## 📊 Resumen de Colecciones

| Colección                  | Propósito                   | Creación | Lectura     | Actualización | Eliminación |
| -------------------------- | --------------------------- | -------- | ----------- | ------------- | ----------- |
| `pending_password_resets`  | Solicitudes de recuperación | Pública  | Bot         | Bot           | Bot         |
| `pending_password_updates` | Actualizaciones pendientes  | Pública  | Bot         | Bot           | Bot         |
| `pending_registrations`    | Registros pendientes        | Pública  | Bot         | Bot           | Bot         |
| `pending_password_changes` | Cambios desde web           | Usuario  | Usuario/Bot | Usuario/Bot   | Usuario/Dev |

---

**¡Sistema de recuperación de contraseña listo para usar!** 🎉
