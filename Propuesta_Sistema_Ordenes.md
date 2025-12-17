# Sistema de Órdenes - Plan de Implementación Actualizado

## Planes y Precios (MXN)

### Planes por Días
| Plan | Duración | Precio | Créditos Diarios |
|------|----------|--------|------------------|
| 1 Día | 1 día | $30 MXN | 10 créditos |
| Semanal | 7 días | $150 MXN | 15 créditos/día |
| Quincenal | 15 días | $250 MXN | 20 créditos/día |
| Mensual | 30 días | $400 MXN | 25 créditos/día |

### Planes por Créditos
| Plan | Créditos | Precio |
|------|----------|--------|
| Paquete 100 | 100 créditos | $50 MXN |
| Paquete 200 | 200 créditos | $90 MXN |
| Paquete 500 | 500 créditos | $200 MXN |
| Paquete 1000 | 1000 créditos | $350 MXN |

---

## Sistema de Comisiones

### Distribución por Venta - Admin Vende
```
Precio Total: $100 MXN
├─ Dueño/Inversor: $60 (60%)
├─ Devs (ambos): $20 (20% total, $10 c/u)
└─ Admin (vendedor): $20 (20%)

```

**Nota:** Cuando un dev vende, se queda con el 40% completo (no se divide entre los 2 devs).

### Cuentas Bancarias
- **Una sola cuenta del Dueño** para recibir todos los pagos
- Ni admins ni devs configuran sus propias bancas
- El dueño distribuye los pagos semanalmente

### Sistema de Pagos Semanales

**Frecuencia:** Cada Viernes

**Proceso:**
1. Sistema genera reporte semanal automático
2. Dueño recibe mensaje en Telegram con:
   - Total de ventas de la semana
   - Comisiones por persona
   - Detalle de cada venta
3. Dueño puede descargar esquema "Pago Semanal"
4. Dueño realiza pagos a cada persona

**Comando para Dueño:**
- `/pagosemanal` - Ver reporte y descargar esquema

### Registro de Comisiones en Firestore
```javascript
commissions/
  {orderId}/
    - totalAmount: 100
    - sellerId: "telegram_id"
    - sellerRole: "admin" | "dev"
    - ownerCommission: 60
    - devsCommission: 20 
    - sellerCommission: 20 
    - status: "pending" | "paid"
    - paidAt: timestamp
    - weekNumber: "2025-W50"
```

---

## Timeouts y Recordatorios

### 1. Timeout de Orden (24h)
```javascript
// Cloud Function programada
exports.cancelExpiredOrders = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = Date.now();
    const expiredOrders = await db.collection('orders')
      .where('status', '==', 'pending')
      .where('createdAt', '<', now - 24 * 60 * 60 * 1000)
      .get();
    
    // Cancelar órdenes expiradas
  });
```

### 2. Confirmación del Cliente (48h + recordatorios cada 4h)
```javascript
// Recordatorios automáticos
48h después de aprobar pago:
  → Enviar mensaje de confirmación

Si no responde:
  → Recordatorio cada 4 horas
  → Máximo 6 recordatorios (24h adicionales)
  → Después de 72h sin respuesta: Marcar como "completado" automáticamente
```

---

## Dashboard de Ganancias (Web)

### Página: `/earnings` o `/ganancias`

**Visible para:** Admin y Dev

#### Métricas Principales
```
┌─────────────────────────────────────┐
│ 💰 Resumen de Ganancias             │
├─────────────────────────────────────┤
│ Total Vendido:        $5,000 MXN    │
│ Comisiones Ganadas:   $3,500 MXN    │
│ Dinero Pagado:        $2,000 MXN    │
│ Dinero en Deuda:      $1,500 MXN    │
└─────────────────────────────────────┘
```

#### Estadísticas de Ventas
```
┌─────────────────────────────────────┐
│ 📊 Estadísticas                     │
├─────────────────────────────────────┤
│ Total Ventas:         50            │
│ Completadas:          42 (84%)      │
│ Rechazadas:           5 (10%)       │
│ Pendientes:           3 (6%)        │
│ Disputadas:           0 (0%)        │
└─────────────────────────────────────┘
```

#### Tabla de Ventas Recientes
| Fecha | Cliente | Plan | Monto | Comisión | Estado |
|-------|---------|------|-------|----------|--------|
| 16/12 | @user1 | Mensual | $400 | $280 | ✅ Completada |
| 15/12 | @user2 | 500 Créditos | $200 | $140 | ⏳ Pendiente |
| 14/12 | @user3 | Semanal | $150 | $105 | ❌ Rechazada |

#### Gráficas
- Ventas por mes (últimos 6 meses)
- Comisiones ganadas vs pagadas
- Distribución de planes vendidos

---

## Flujo Actualizado del Sistema

### 1. Cliente: `/buy`
```
Bot muestra:
──────────────────────
💰 Planes Disponibles
──────────────────────

📅 Planes por Días:
• 1 Día - $30 MXN
• Semanal - $150 MXN
• Quincenal - $250 MXN
• Mensual - $400 MXN

💳 Planes por Créditos:
• 100 Créditos - $50 MXN
• 200 Créditos - $90 MXN
• 500 Créditos - $200 MXN
• 1000 Créditos - $350 MXN

[1 Día] [Semanal]
[Quincenal] [Mensual]
[100 Cr] [200 Cr]
[500 Cr] [1000 Cr]
```

### 2. Admin Acepta Orden
- Notificación a todos los admins (NO devs, solo admins pueden vender)
- Primer admin que acepta se queda con la orden
- Admin gana 70% de comisión

### 3. Cliente Recibe Datos de Pago OWNER
```
✅ Orden Aceptada por @AdminUsername

💳 Datos de Pago:
──────────────────────
Banco: BBVA
Cuenta: 1234 5678 9012 3456
CLABE: 012345678901234567
Titular: CougarMx (DEV)
──────────────────────

💰 Total a pagar: $400 MXN

📸 Envía tu comprobante:
/capturapago

⏰ Tienes 24 horas
```

### 4. Sistema de Recordatorios
```
Después de aprobar pago:
├─ 48h: "¿Recibiste tu plan?"
├─ 52h: Recordatorio 1
├─ 56h: Recordatorio 2
├─ 60h: Recordatorio 3
├─ 64h: Recordatorio 4
├─ 68h: Recordatorio 5
└─ 72h: Auto-completar si no responde
```

---

## Estructura de Base de Datos Actualizada

### `orders/`
```javascript
{
  orderId: "auto-generated",
  clientId: "telegram_id",
  adminId: "telegram_id", // Solo admins, NO devs
  
  plan: {
    type: "days" | "credits",
    name: "Mensual" | "500 Créditos",
    duration: 30, // solo para planes por días
    credits: 500, // solo para planes por créditos
    price: 400,
    currency: "MXN"
  },
  
  commissions: {
    admin: 280, // 20%
    dev1: 30, // 10%
    dev2: 30, // 10%
    investor: 60 // 60%
  },
  
  status: "pending" | "accepted" | "payment_sent" | "approved" | "completed" | "expired",
  
  expiresAt: timestamp, // 24h después de creación
  
  confirmationReminders: {
    sent: 0,
    lastSentAt: timestamp,
    maxReminders: 6
  },
  
  autoCompletedAt: timestamp // si se auto-completó sin confirmación
}
```

### `earnings/` (Nueva colección)
```javascript
{
  userId: "telegram_id", // admin o dev
  role: "admin" | "dev",
  
  totals: {
    totalSales: 50,
    totalAmount: 5000,
    totalCommissions: 3500,
    paidCommissions: 2000,
    pendingCommissions: 1500
  },
  
  monthly: {
    "2025-12": {
      sales: 10,
      amount: 1000,
      commission: 700
    }
  },
  
  lastUpdated: timestamp
}
```

---

## Comandos a Implementar

### Cliente
- `/buy` - Crear orden de compra
- `/capturapago` - Enviar comprobante de pago
- `/misordenes` - Ver historial de órdenes

### Admin
- `/ordenes` - Ver órdenes pendientes
- `/misventas` - Ver historial de ventas
- `/ganancias` - Ver resumen de comisiones

### Dev
- `/ordenes` - Ver órdenes pendientes (pueden vender)
- `/misventas` - Ver historial de ventas
- `/ganancias` - Ver comisiones totales
- `/banca` - Configurar cuenta bancaria (solo dueño)

### Dueño/Inversor
- `/pagosemanal` - Ver reporte semanal y descargar esquema
- `/banca` - Configurar cuenta bancaria única
- `/ganancias` - Ver ingresos totales
- `/stats` - Estadísticas generales del sistema

### Super Admin (Tú)
- `/frauds` - Ver casos de fraude detectados
- `/suspender [userId]` - Suspender usuario
- `/stats` - Estadísticas generales del sistema

---

## Implementación por Fases

### Fase 1: Comandos y Planes ✅
- [ ] Definir planes en constants.js
- [ ] `/buy` comando con botones inline
- [ ] Callbacks para cada plan
- [ ] Crear orden en Firestore

### Fase 2: Sistema de Órdenes
- [ ] Notificar solo a admins
- [ ] Aceptar orden (solo admins)
- [ ] Enviar datos de banca DEV
- [ ] Timeout 24h con Cloud Function

### Fase 3: Comprobantes
- [ ] `/capturapago` comando
- [ ] Subir a Firebase Storage
- [ ] Aprobar/Rechazar pago
- [ ] Aplicar plan según tipo

### Fase 4: Confirmación y Recordatorios
- [ ] Mensaje confirmación 48h
- [ ] Sistema de recordatorios cada 4h
- [ ] Auto-completar después de 72h
- [ ] Detección de fraude

### Fase 5: Comisiones
- [ ] Calcular comisiones automáticamente
- [ ] Registrar en la base de datos
- [ ] Dashboard de ganancias (web)
- [ ] Gráficas y estadísticas

### Fase 6: Configuración Banca DEV
- [ ] `/banca` comando (solo dueño o dev)
- [ ] Interfaz web para editar
- [ ] Encriptación de datos

---

## Reporte Semanal de Pagos

### Comando: `/pagosemanal`

**Disponible para:** Dueño/Inversor únicamente

**Formato del Reporte:**

```
📊 REPORTE SEMANAL DE PAGOS
Semana: 50 (11-17 Diciembre 2025)
──────────────────────────────────

💰 RESUMEN GENERAL:
• Total Ventas: 15 órdenes
• Ingresos Totales: $2,450 MXN
• Tu Parte (60%): $1,470 MXN

──────────────────────────────────

👥 PAGOS A REALIZAR:

📌 Admins:
• @AdminUser1: $120 MXN (3 ventas)
• @AdminUser2: $80 MXN (2 ventas)

📌 Devs:
• @Dev1: $50 MXN (comisiones)
• @Dev2: $50 MXN (comisiones)

──────────────────────────────────

📋 DETALLE POR VENTA:

1. Orden #ORD001 - @AdminUser1
   Plan: Mensual ($400)
   Comisiones: Dueño $240, Admin $80, Devs $40

2. Orden #ORD002 - @AdminUser2
   Plan: 500 Créditos ($200)
   Comisiones: Dueño $120, Admin $40, Devs $40 (entre los dos devs)

[... más ventas ...]

──────────────────────────────────

📥 [Descargar Excel]
📄 [Descargar PDF]
```

### Automatización

**Cloud Function programada:**
```javascript
// Ejecutar cada Viernes a las 10:00 AM
exports.sendWeeklyPaymentReport = functions.pubsub
  .schedule('0 10 * * 5')  // Viernes 10 AM
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    // 1. Calcular semana actual
    // 2. Obtener todas las órdenes completadas de la semana
    // 3. Calcular comisiones por persona
    // 4. Generar reporte
    // 5. Enviar mensaje al dueño
    // 6. Generar archivos Excel y PDF
  });
```

### Archivos Descargables

**Excel (.xlsx):**
- Hoja 1: Resumen general
- Hoja 2: Pagos por persona
- Hoja 3: Detalle de cada venta

**PDF:**
- Formato profesional con logo
- Tabla de pagos
- Gráficas de ventas

---

## Información Actualizada

**Estructura de Comisiones:**
- ✅ Admin vende: 60% Dueño, 20% Devs, 20% Admin

**Sistema de Pagos:**
- ✅ Cuenta bancaria del Dueño
- ✅ Pagos semanales cada Viernes
- ✅ Reporte automático vía Telegram

**Pendiente:**
- ID de Telegram del Dueño/Inversor
- IDs de los 2 Devs
- Confirmación de precios finales
- Ver si sera banca del dueño o de cada uno
- Confirmación de pagos semanales

