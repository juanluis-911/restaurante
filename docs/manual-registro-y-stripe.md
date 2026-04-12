# Manual: Registrar tu restaurante y conectar Stripe

## Contenido

1. [Crear tu cuenta](#1-crear-tu-cuenta)
2. [Configurar tu restaurante](#2-configurar-tu-restaurante)
3. [Conectar Stripe para recibir pagos](#3-conectar-stripe-para-recibir-pagos)
4. [Verificar que todo funciona](#4-verificar-que-todo-funciona)
5. [Facturación y tarifas](#5-facturación-y-tarifas)
6. [Preguntas frecuentes](#6-preguntas-frecuentes)

---

## 1. Crear tu cuenta

### 1.1 Acceder al registro

Ve a la página de inicio de sesión de la plataforma. Verás tres opciones de rol:

- **Dueño de restaurante** — elige esta opción
- Conductor
- Cliente

> Selecciona **Dueño de restaurante** antes de continuar.

### 1.2 Registrarse con correo y contraseña

1. Escribe tu correo electrónico.
2. Crea una contraseña de al menos 6 caracteres.
3. Haz clic en **Registrarse**.

### 1.3 Registrarse con Google (alternativa rápida)

1. Haz clic en **Continuar con Google**.
2. Selecciona tu cuenta de Google.
3. La plataforma te redirigirá a elegir tu rol — selecciona **Dueño de restaurante**.

---

## 2. Configurar tu negocio

Después del registro, el sistema te lleva automáticamente al asistente de configuración. Este proceso tiene tres pasos.

### Paso 0 — Tipo de negocio

Selecciona el tipo que mejor describe tu operación:

| Opción | Cuándo elegirla |
|--------|-----------------|
| **Restaurante** | Tienes un menú con precios fijos. Los clientes eligen platillos y pagan en el momento. |
| **Tienda** | Tiendas de abarrotes, fruterías, minisupers, etc. Los clientes describen lo que quieren y tú cotizas el precio antes de confirmar el pedido. |

> Esta configuración determina el flujo de pedidos. Se puede contactar a soporte si necesitas cambiarla después.

### Paso 1 — Información básica

| Campo | Descripción |
|-------|-------------|
| **Nombre del negocio** | El nombre que verán tus clientes. Requerido. |
| **URL pública** | Identificador único en la plataforma (ej. `mi-tienda`). Se genera automáticamente desde el nombre, pero puedes editarlo. Debe ser único. |
| **Zona horaria** | Selecciona la zona horaria donde opera tu negocio: Sonora, Ciudad de México, Tijuana, Monterrey o Cancún. |

### Paso 2 — Detalles adicionales

| Campo | Descripción |
|-------|-------------|
| **Teléfono** | Número de contacto visible en tu página pública. Opcional. |
| **Dirección** | Dirección física visible en tu página pública. Opcional. |

> Todos estos datos se pueden modificar después desde **Configuración** en tu panel de administración.

### Lo que se crea automáticamente

Al completar el registro, el sistema configura de forma automática:

- Tu perfil de restaurante en la base de datos.
- Horarios de atención predeterminados:
  - **Lunes a sábado:** 9:00 AM – 10:00 PM
  - **Domingo:** Cerrado

Podrás ajustar los horarios desde tu panel de administración.

### Tu página pública

Una vez registrado, tu negocio estará disponible en:

```
https://turieats.com/[tu-url-publica]
```

---

## 3. Conectar Stripe para recibir pagos

Stripe es el procesador de pagos que permite a tus clientes pagar en línea con tarjeta. **Sin Stripe conectado, no podrás recibir pagos en línea.**

> **Tiendas:** Los pedidos llegan sin pago, el cliente paga después de que tú cotizas el precio. Aun así necesitas Stripe conectado para que los clientes puedan pagar con tarjeta al aceptar tu cotización.

### 3.1 ¿Por qué necesitas Stripe?

- Los pagos de tus clientes van directo a tu cuenta de Stripe.
- La plataforma descuenta su comisión de forma transparente.
- Tú controlas tus fondos desde el panel de Stripe.

### 3.2 Iniciar la conexión

1. En tu panel de administración, ve a **Configuración**.
2. Busca la sección **Stripe**.
3. Haz clic en **Conectar cuenta de Stripe**.

El sistema te redirigirá automáticamente al formulario de registro de Stripe.

### 3.3 Completar el registro en Stripe

En la página de Stripe deberás proporcionar:

- **Información personal:** nombre, fecha de nacimiento, dirección.
- **Información del negocio:** nombre comercial, giro, sitio web (puedes usar tu URL pública de la plataforma).
- **Cuenta bancaria:** CLABE interbancaria para recibir depósitos.
- **Verificación de identidad:** puede requerir foto del INE u otro documento oficial.

> Stripe valida la información antes de activar tu cuenta. Este proceso puede tomar unos minutos o hasta 24 horas en casos donde se requiere revisión adicional.

### 3.4 Regresar a la plataforma

Al terminar el formulario de Stripe, la plataforma te redirige automáticamente a **Configuración** con uno de estos mensajes:

| Mensaje | Significado |
|---------|-------------|
| Stripe conectado exitosamente | Tu cuenta está activa y lista para recibir pagos. |
| Stripe pendiente de verificación | Completaste el formulario pero Stripe aún valida tu información. Vuelve a intentar en unas horas. |
| Error al conectar Stripe | Ocurrió un problema. Intenta el proceso nuevamente. |

### 3.5 Estados de tu conexión Stripe

En la sección de Configuración verás el estado actual:

- **No conectado** — Debes iniciar el proceso.
- **Pendiente** — Formulario enviado, en espera de verificación de Stripe.
- **Activo** — Todo en orden, puedes recibir pagos.

### 3.6 Cómo fluye el dinero

```
Cliente paga en línea
        ↓
  Stripe Checkout
        ↓
  Cuenta Stripe del restaurante (depósito directo)
        ↓
  La plataforma cobra su comisión semanalmente por separado
```

---

## 4. Verificar que todo funciona

Antes de anunciar tu restaurante a tus clientes, verifica lo siguiente:

### Lista de verificación

- [ ] Nombre y URL del restaurante configurados
- [ ] Zona horaria correcta
- [ ] Stripe en estado **Activo**
- [ ] Al menos una categoría y un producto publicados en el menú
- [ ] Horarios de atención revisados
- [ ] Teléfono y dirección capturados (opcional pero recomendado)

### Hacer un pedido de prueba

1. Abre tu URL pública en una nueva ventana del navegador.
2. Agrega un producto al carrito.
3. En el paso de pago, Stripe te mostrará el formulario de tarjeta.
4. Usa la tarjeta de prueba: `4242 4242 4242 4242`, fecha futura, CVV cualquiera.
5. Verifica que el pedido aparezca en tu panel bajo **Órdenes**.

> Las tarjetas de prueba solo funcionan si la plataforma está configurada en modo `test` de Stripe. Consulta al administrador si no estás seguro.

---

## 5. Facturación y tarifas

La plataforma cobra una comisión por uso según los pedidos procesados cada semana.

### Tarifas

| Tipo de pedido | Tarifa |
|----------------|--------|
| Pedido en línea (pagado con tarjeta por el cliente) | $5.00 MXN por pedido |
| Pedido POS (capturado manualmente por el staff) | $0.50 MXN por pedido |

**Mínimo semanal: $100 MXN** — si tus comisiones calculadas son menores a $100, se cobra el mínimo de todas formas.

**Ejemplo:**
- 30 pedidos en línea × $5 = $150 MXN
- 10 pedidos POS × $0.50 = $5 MXN
- Total = $155 MXN (se cobra $155 porque supera el mínimo)

### Ciclo de facturación

- El ciclo va de **lunes a domingo**.
- Cada lunes se genera automáticamente una factura por la semana anterior.
- La factura tiene **3 días** de plazo para pagarse.
- El cobro se realiza a través de Stripe (recibirás la factura por correo).

### ¿Qué pasa si no pago a tiempo?

Si la factura vence sin pagarse, tu restaurante queda **suspendido**: no podrá recibir nuevos pedidos en línea hasta que el pago sea confirmado.

En cuanto Stripe confirme el pago, la suspensión se levanta automáticamente.

### Ver tu historial de facturación

Ve a **Facturación** en tu panel de administración. Ahí encontrarás:

- El conteo de pedidos de la semana actual y el cargo proyectado.
- El historial de las últimas 8 semanas con el estado de cada factura.
- Links directos para pagar facturas pendientes.

---

## 6. Preguntas frecuentes

**¿Puedo tener varios restaurantes con la misma cuenta?**
Actualmente cada cuenta está vinculada a un restaurante.

**¿Qué pasa si ya tengo una cuenta Stripe?**
El proceso de conexión crea una cuenta Stripe nueva o conecta una existente. Si tienes dudas, contacta al soporte de la plataforma.

**¿Cómo desconecto Stripe?**
En **Configuración → Stripe**, haz clic en **Desconectar**. Esto desvincula la cuenta de la plataforma pero no elimina tu cuenta de Stripe. Si vuelves a conectar, deberás completar el proceso de onboarding nuevamente.

**¿Puedo cambiar mi URL pública después?**
Sí, desde **Configuración**. Ten en cuenta que si ya compartiste tu URL anterior, los links dejarán de funcionar.

**¿Los pedidos POS también generan comisión?**
Sí, a $0.50 MXN por pedido. Los pedidos POS son aquellos que el staff captura manualmente en el sistema, donde el cliente paga en efectivo, con tarjeta física u otro medio presencial.

**¿Cómo sé que un pago en línea fue exitoso?**
El pedido aparece en tu panel con el estado **Recibido** en cuanto Stripe confirma el pago. También recibirás la notificación en tiempo real.
