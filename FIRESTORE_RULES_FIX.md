# Solución: Reglas de Firestore para Password Changes

## Problema

El bot usa **Firebase Admin SDK** que tiene privilegios especiales y **NO se autentica como un usuario normal**. Las reglas actuales requieren `isAuthenticated()`, lo cual bloquea al Admin SDK.

## Solución

Actualiza las reglas de `pending_password_changes` en tu archivo `firestore.rules`:

```javascript
// ========== PASSWORD CHANGES ==========

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
```

## Explicación

- `request.auth == null` → Permite acceso al Admin SDK (que no tiene auth)
- `isAuthenticated()` → Permite acceso a usuarios web autenticados
- Combinados con `||` (OR) → Ambos pueden acceder

## Alternativa Más Segura (Recomendada)

Si prefieres no abrir completamente el acceso, puedes usar esta regla que solo permite lectura de documentos no usados:

```javascript
match /pending_password_changes/{changeId} {
  // Permitir lectura:
  // - Admin SDK puede leer documentos no usados
  // - Usuario dueño puede leer sus documentos
  allow read: if (request.auth == null && resource.data.used == false) ||
                 (isAuthenticated() && resource.data.userId == request.auth.uid);

  // Resto igual...
  allow create: if isAuthenticated() &&
                   request.resource.data.userId == request.auth.uid;

  allow update: if request.auth == null ||
                   (isAuthenticated() && resource.data.userId == request.auth.uid);

  allow delete: if isAuthenticated() &&
                   (resource.data.userId == request.auth.uid || isDev());
}
```

## Pasos para Aplicar

### Opción 1: Firebase Console (Más rápido)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. **Firestore Database** → **Reglas**
4. Reemplaza la sección de `pending_password_changes`
5. Click **Publicar**

### Opción 2: Firebase CLI

```bash
cd "h:\Proyectos Web\Chk-Web-Beta\Chk_Bot_Beta"
firebase deploy --only firestore:rules
```

## Verificación

Una vez desplegadas las reglas:

1. Solicita cambio de contraseña en la web
2. El código debería llegar a Telegram en ~1 segundo
3. Verifica los logs del bot: `Get-Content logs/combined.log -Tail 20`

---

**Nota de Seguridad:** El Admin SDK tiene acceso completo a Firestore independientemente de las reglas, pero las reglas se aplican a los listeners en tiempo real. Por eso necesitamos permitir `request.auth == null` para que el listener funcione.
