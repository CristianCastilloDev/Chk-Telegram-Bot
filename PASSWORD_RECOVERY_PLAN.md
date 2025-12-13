# Plan: Sistema de Recuperación de Contraseña vía Telegram

## 📋 Problema Actual

1. **Login falla** - Firebase Auth requiere email para login, pero creamos usuarios con email temporal (`username@telegram.user`)
2. **No hay recuperación de contraseña** - Usuarios no pueden recuperar su contraseña

## ✅ Solución

### 1. Arreglar Login

- Modificar `Login.jsx` para buscar el email real del usuario por username
- Usar ese email para autenticar con Firebase Auth

### 2. Implementar "Olvidé mi Contraseña"

- Agregar link en página de login
- Usuario ingresa username o Telegram ID
- Sistema envía código de verificación a Telegram
- Usuario confirma y establece nueva contraseña

## 🔄 Flujo de Recuperación

```
1. Usuario click en "Olvidé mi contraseña"
2. Ingresa username o Telegram ID
3. Sistema crea pending_password_reset
4. Bot detecta y envía mensaje con código
5. Usuario ingresa código en web
6. Usuario establece nueva contraseña
7. Password actualizado en Firebase Auth
```

## 📝 Archivos a Crear/Modificar

### Web App

- ✏️ `Login.jsx` - Agregar link "Olvidé mi contraseña"
- ✨ `ForgotPassword.jsx` - Nueva página
- ✏️ `AuthContext.jsx` - Función de login mejorada

### Bot

- ✨ `passwordResetService.js` - Listener
- ✨ `passwordResetCallbacks.js` - Handlers
- ✏️ `bot.js` - Integrar servicio

---

Implementando solución...
