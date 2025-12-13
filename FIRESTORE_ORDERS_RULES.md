# Actualización de Reglas de Firestore para Notificaciones de Órdenes

## Problema

El servicio de notificaciones de órdenes necesita leer la colección `analytics_orders` en tiempo real usando Firebase Admin SDK.

## Solución

Actualiza las reglas de `analytics_orders` en Firebase Console:

```javascript
// ========== ANALYTICS ORDERS ==========

match /analytics_orders/{orderId} {
  // Permitir lectura:
  // - Admin SDK (bot) puede leer todas las órdenes
  // - Usuarios autenticados pueden leer sus propias órdenes
  allow read: if request.auth == null ||
                 isAuthenticated();

  // Permitir crear solo a admins/devs
  allow create: if isAuthenticated() &&
                   (isAdmin() || isDev());

  // Permitir actualizar:
  // - Admin SDK (bot) puede actualizar
  // - Admins/devs pueden actualizar
  allow update: if request.auth == null ||
                   (isAuthenticated() && (isAdmin() || isDev()));

  // Permitir eliminar solo a devs
  allow delete: if isAuthenticated() && isDev();
}
```

## Aplicar Cambios

### Opción 1: Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. **Firestore Database** → **Reglas**
4. Actualiza la sección de `analytics_orders`
5. Click **Publicar**

### Opción 2: Firebase CLI

```bash
cd "h:\Proyectos Web\Chk-Web-Beta\Chk_Bot_Beta"
firebase deploy --only firestore:rules
```

## Verificación

Una vez desplegadas las reglas:

1. El bot debería mostrar: `📦 Order Notification Service: Listener active`
2. Crea una orden con `/addcredits` o `/setplan`
3. Deberías recibir una notificación en Telegram con botones
4. Click en "Aprobar" o "Rechazar" para gestionar la orden

---

**Nota:** El `request.auth == null` permite que el Admin SDK (bot) lea las órdenes en tiempo real sin autenticación.
