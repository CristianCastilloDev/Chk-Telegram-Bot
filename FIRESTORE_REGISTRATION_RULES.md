# Reglas de Firestore para Sistema de Registro

## Colección: `pending_registrations`

Actualiza las reglas de Firestore para permitir el registro público:

```javascript
// ========== PENDING REGISTRATIONS ==========

match /pending_registrations/{regId} {
  // Permitir crear sin autenticación (registro público)
  allow create: if true;

  // Permitir leer solo al Admin SDK (bot)
  allow read: if request.auth == null;

  // Permitir actualizar solo al Admin SDK (bot)
  allow update: if request.auth == null;

  // Permitir eliminar solo al Admin SDK (bot) para limpieza
  allow delete: if request.auth == null;
}
```

## Aplicar Cambios

### Opción 1: Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. **Firestore Database** → **Reglas**
4. Agrega la sección de `pending_registrations`
5. Click **Publicar**

### Opción 2: Firebase CLI

```bash
cd "h:\Proyectos Web\Chk-Web-Beta\Chk_Bot_Beta"
firebase deploy --only firestore:rules
```

## Verificación

Una vez desplegadas las reglas:

1. El bot debería mostrar: `📝 Registration Service: Listener active`
2. Ve a `/register` en la web
3. Ingresa username, password y Telegram ID
4. Click en "Crear Cuenta"
5. Deberías recibir mensaje en Telegram con botones
6. Click en "✅ Confirmar"
7. Cuenta creada y redirigido a login

---

**Nota:** El `allow create: if true` permite que cualquiera cree un registro pendiente, pero la cuenta solo se crea si el usuario confirma desde Telegram.
