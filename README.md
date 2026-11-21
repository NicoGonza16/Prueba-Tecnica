# Catálogo de cuentas — Aravia

Módulo que administra el catálogo de cuentas contable: la lista jerárquica
(clase → grupo → cuenta → subcuenta) con la que una empresa clasifica sus
registros. Backend en NestJS con Clean Architecture y frontend en React.

| Carpeta | Qué hay | Puerto |
|---------|---------|:------:|
| `api/` | NestJS 12 + TypeScript (ESM), Clean Architecture, persistencia en memoria | 3000 |
| `web/` | React 19 + Vite 8 + TypeScript, organizado por funcionalidad | 5173 |

## Cómo correrlo

Requisitos: **Node 22** (`.nvmrc`) y **npm 10 o superior**.

```bash
npm install     # instala la raíz, api/ y web/
npm run dev     # levanta la API (3000) y el front (5173) a la vez
```

Abre http://localhost:5173.

| Script | Qué hace |
|--------|----------|
| `npm run dev` | API y front juntos, en modo watch |
| `npm run dev:api` / `npm run dev:web` | Solo uno de los dos |
| `npm run build` | Compila los dos |
| `npm test` | Pruebas unitarias de la API (Vitest) |
| `npm run test:e2e --prefix api` | Pruebas e2e de la API (Supertest contra la app real) |
| `npm run lint` | oxlint en los dos |

Configuración: el front lee la URL de la API de `VITE_API_URL` (por defecto
`http://localhost:3000`, ver `web/.env.example`) y la API acepta el origen de
`WEB_ORIGIN` (por defecto `http://localhost:5173`).

> Los datos viven en memoria: al reiniciar la API el catálogo queda vacío.
> Empieza creando una clase (código de 1 dígito, p. ej. `1 Activo`, débito).

## Reglas de negocio

1. Cada cuenta tiene un código numérico y un nombre.
2. La longitud del código define el nivel: 1 → Clase, 2 → Grupo, 4 → Cuenta,
   6 → Subcuenta.
3. El padre es la cuenta cuyo código es su prefijo en el nivel anterior
   (`110505` → `1105` → `11` → `1`). Las clases no tienen padre.
4. No se puede crear una cuenta si su padre no existe.
5. No se puede eliminar una cuenta que tenga hijas.
6. Solo las cuentas sin hijas admiten movimientos.
7. El código es único en todo el catálogo.
8. Cada clase tiene una naturaleza (débito o crédito) y sus descendientes la
   heredan.

---

## Backend: Clean Architecture

### Cómo la entiendo

La idea central es la **regla de dependencia**: el código se organiza en
círculos concéntricos y las dependencias solo apuntan hacia adentro. El centro
(las reglas del negocio) no sabe nada de lo que lo rodea (el framework, HTTP,
la base de datos); el borde sí conoce el centro.

- **Dominio** (el centro): entidades y reglas puras. No importa NestJS ni sabe
  cómo se guardan los datos.
- **Aplicación** (casos de uso): orquesta el dominio para cumplir una intención
  del usuario ("crear una cuenta"). Depende solo del dominio.
- **Infraestructura** (el borde): los adaptadores al mundo real — HTTP, la
  persistencia y el cableado del framework.

La pieza que lo hace funcionar es la **inversión de dependencias**: el caso de
uso necesita guardar cuentas, pero no puede depender de una implementación
concreta (eso apuntaría hacia afuera). Entonces **el dominio define la
interfaz** del repositorio (`AccountRepository`, el "puerto") y la
infraestructura la implementa (el "adaptador"). El framework inyecta la
implementación en tiempo de ejecución. Resultado: puedo cambiar la base de
datos sin tocar una línea de reglas de negocio, y probar los casos de uso sin
levantar ni Nest ni una base de datos.

### Cómo está organizado

```
api/src/catalog/
  domain/                          # sin NestJS, sin base de datos
    code.ts                        #   value object: valida dígitos + longitud 1/2/4/6, deriva nivel y padre
    nature.ts                      #   DEBIT | CREDIT
    account.ts                     #   entidad: siempre válida una vez creada
    account.repository.ts          #   PUERTO: interfaz AccountRepository + token de inyección
    errors.ts                      #   errores de dominio (no saben de HTTP)
  application/                     # casos de uso: solo dependen del dominio
    create-account.use-case.ts     #   unicidad, padre existente, herencia de naturaleza
    get-catalog.use-case.ts        #   lista → árbol
    delete-account.use-case.ts     #   rechaza si tiene hijas
    catalog-tree.ts                #   función pura que arma el árbol y calcula allowsMovements
    account.view.ts                #   forma de salida (AccountNode / TreeNode)
  infrastructure/                  # adaptadores
    persistence/in-memory-account.repository.ts   # ADAPTADOR del puerto (Map en memoria)
    http/accounts.controller.ts    #   solo HTTP: valida forma, llama al caso de uso
    http/accounts.schemas.ts       #   Zod: forma del request
    http/domain-exception.filter.ts#   único lugar que traduce errores a status HTTP
    catalog.module.ts              #   raíz de composición: une puerto ↔ adaptador
```

Decisiones concretas:

- **Ningún import de `@nestjs/*` ni de `zod` en `domain/` ni en
  `application/`.** Los casos de uso son clases planas, sin decoradores; el
  módulo los construye con `useFactory` e inyecta el repositorio por su token.
  Para cambiar la persistencia basta con cambiar la línea
  `{ provide: ACCOUNT_REPOSITORY, useClass: InMemoryAccountRepository }`.
- **Dónde vive cada regla.** Las que se pueden decidir con una sola cuenta
  (formato y longitud del código, nivel, padre, nombre no vacío y de hasta 100
  caracteres, naturaleza válida) están en el dominio, dentro de `Code` y `Account`. Las que necesitan
  mirar el resto del catálogo (unicidad, que el padre exista, heredar su
  naturaleza, no borrar con hijas) están en los casos de uso, que consultan el
  repositorio.
- **El código es texto, no número:** conserva ceros a la izquierda y es un
  prefijo, no una cantidad.
- **La naturaleza se resuelve al crear:** una clase la declara; cualquier otra
  cuenta copia la de su padre. Así cada cuenta lleva su naturaleza y el árbol
  no necesita consultas extra. Si un cliente envía `nature` para una cuenta que
  no es clase, no se ignora en silencio: tiene que ser válida e igual a la
  heredada, o la API responde `NATURE_MISMATCH` (regla 8).
- **`allowsMovements` se calcula al leer**, no se guarda: depende de si la
  cuenta tiene hijas, que cambia cuando se crean o borran otras cuentas.
- **Zod valida solo la forma** del request (que `code` y `name` sean texto).
  Las reglas de negocio no se duplican ahí: si Zod rechazara un código de
  longitud 3, el error llegaría como validación genérica en vez de como
  `INVALID_CODE` del dominio.
- **Errores.** El dominio lanza errores propios; un único filtro global los
  traduce a HTTP con un cuerpo uniforme `{ code, detail }`. También conserva
  el status de los errores de cliente que ocurren antes de llegar a Nest (un
  body de más de 100 kB responde 413, no 500).

### Por qué persistencia en memoria

El enunciado la permite y lo que se evalúa es la arquitectura y las reglas, no
la infraestructura. Además es justo lo que la arquitectura hace barato
reemplazar: un adaptador con SQLite o PostgreSQL implementaría la misma
interfaz `AccountRepository` y se registraría en `catalog.module.ts`, sin
tocar dominio ni casos de uso. El costo es que los datos se pierden al
reiniciar la API.

### API

| Método | Ruta | Request | Respuesta |
|---|---|---|---|
| `POST` | `/accounts` | `{ code, name, nature? }` — `nature` obligatoria para una clase; el resto la hereda (si se envía, debe coincidir) | `201` con la cuenta creada |
| `GET` | `/accounts` | — | `200` con el árbol: `{ code, name, nature, level, allowsMovements, children[] }` |
| `DELETE` | `/accounts/:code` | — | `204` |

Errores, siempre como `{ code, detail }`:

| `code` | Status | Cuándo |
|---|:---:|---|
| `INVALID_CODE` | 400 | no numérico o longitud distinta de 1, 2, 4, 6 |
| `INVALID_NAME` | 400 | nombre vacío o de más de 100 caracteres |
| `INVALID_NATURE` / `MISSING_NATURE` | 400 | naturaleza inválida / clase sin naturaleza |
| `NATURE_MISMATCH` | 400 | se envía a una cuenta no clase una naturaleza distinta de la heredada (regla 8) |
| `PARENT_NOT_FOUND` | 400 | el padre no existe (regla 4) |
| `VALIDATION_ERROR` | 400 | el body no tiene la forma esperada |
| `ACCOUNT_NOT_FOUND` | 404 | se intenta borrar una cuenta inexistente |
| `DUPLICATE_CODE` | 409 | el código ya existe (regla 7) |
| `HAS_CHILDREN` | 409 | se intenta borrar una cuenta con hijas (regla 5) |
| `PAYLOAD_TOO_LARGE` | 413 | el body supera 100 kB |

### Pruebas

- **Unitarias** (`npm test`): dominio (`Code`, `Account`), cada caso de uso
  con un repositorio falso (`vi.fn()`, sin infraestructura), el armado del
  árbol y el repositorio en memoria. Hay un caso por regla.
- **e2e** (`npm run test:e2e --prefix api`): la app real con Supertest; cubre
  201/200/204 y cada 400/404/409 con su cuerpo `{ code, detail }`.

---

## Frontend

### Cómo está organizada la carpeta (y por qué)

En el frontend no se exige Clean Architecture; lo organicé **por
funcionalidad**, separando la obtención de datos de la presentación:

```
web/src/
  main.tsx, App.tsx, index.css     # arranque, QueryClientProvider, estilos propios
  lib/http.ts                      # fetch → ApiError { status, code, detail } (también red caída y timeout)
  components/ui/                   # UI genérica: Spinner, ErrorMessage
  features/catalog/                # todo lo del catálogo junto
    api/                           #   frontera con la API: tipos del contrato, esquemas Zod, llamadas
    hooks/                         #   useCatalog, useCreateAccount, useDeleteAccount, useTreeExpansion
    lib/                           #   lógica pura sin React: reglas del código, error → campo
    components/                    #   CatalogPage, AccountTree(Node), CreateAccountForm, ConfirmDeleteDialog
```

- **Por funcionalidad:** para cambiar o quitar el catálogo se toca una
  carpeta; otra funcionalidad (p. ej. asientos) iría al lado sin mezclarse.
- **Datos separados de la presentación:** los componentes nunca llaman a
  `fetch`; usan hooks, que usan `api/`, que usa `lib/http.ts`. Si la API
  cambia una ruta o un formato, el cambio queda en `api/`.
- **Reglas en funciones puras** (`lib/accountCode.ts`, `lib/errorField.ts`):
  las comparten el formulario, el árbol y el diálogo, y se pueden probar sin
  React.

### Librerías y qué resuelve cada una

| Librería | Qué resuelve |
|---|---|
| **@tanstack/react-query** | Estado del servidor: caché del árbol, estados de carga/error listos, e **invalidación** tras crear o borrar en lugar de recargar a mano. |
| **zod** | Validación del formulario antes de enviar (dígitos, longitud, nombre, naturaleza solo para clases, prefijo de la hija) y validación de las respuestas de la API, para mostrar un error claro si el contrato cambia en vez de romper la pantalla. |
| **react-hook-form** + **@hookform/resolvers** | Estado del formulario integrado con Zod; su `setError` coloca cada error de la API **junto a su campo** y le da foco. |

Sin librería de componentes: la UI es chica y CSS propio basta. El diálogo es
el `<dialog>` nativo (bloquea el fondo, atrapa el foco, cierra con Escape).
Peticiones con `fetch` nativo.

### Núcleo cubierto

- **Árbol** con expandir/colapsar (más "Expandir todo / Colapsar todo").
- **Alta** con validación previa y los errores de la API junto al campo que
  corresponde (`PARENT_NOT_FOUND` y `DUPLICATE_CODE` junto a Código, etc.).
- **Eliminar** desde el árbol con confirmación; si la cuenta tiene hijas, el
  diálogo muestra el error y desactiva el reintento.
- **Carga y error** en todo: spinner, panel de error con Reintentar, estado
  vacío, "Creando…" / "Eliminando…", y un mensaje claro si la API no responde.

---

## Opcionales elegidos y por qué

| Opcional | ¿Incluido? | Por qué |
|---|:---:|---|
| Mostrar **nivel y naturaleza** en el árbol | ✅ | Muy barato (ya vienen en la respuesta) y deja ver que el nivel por longitud y la naturaleza heredada se calculan bien. Añadí también "Admite movimientos" (regla 6). |
| **Crear hija** desde el nodo con el código prellenado | ✅ | Refuerza la regla del prefijo y evita el error más común (equivocarse de padre o de longitud). Oculta la naturaleza y muestra la heredada. |
| **Caché e invalidación** | ✅ | Sale casi gratis con React Query, que ya usaba para los estados de carga y error. |
| Buscar por código o nombre | ❌ | Prioricé dejar el núcleo y la arquitectura bien probados. |
| Renombrar desde el árbol | ❌ | La entidad ya tiene `rename`, pero no hice el caso de uso ni el endpoint. |

## Qué dejé afuera

- Persistencia real (los datos se pierden al reiniciar).
- Búsqueda y renombrado.
- Pruebas automatizadas del frontend: lo verifiqué con build, lint y probando
  los flujos en el navegador contra la API real, pero no hay tests de
  componentes.
- Un esquema compartido entre API y front: las reglas de formato del código
  están replicadas en `web/src/features/catalog/lib/accountCode.ts`. La API
  sigue siendo la fuente de verdad y su respuesta siempre se muestra.

## Qué haría con más tiempo

1. **Adaptador de base de datos** (p. ej. SQLite con `@nestjs/drizzle`)
   implementando `AccountRepository`, con restricción `UNIQUE` sobre el código
   como última defensa ante dos altas simultáneas del mismo código.
2. **Tests del frontend** con Vitest + Testing Library: las funciones puras de
   `lib/`, el formulario (errores por campo) y el diálogo.
3. **Renombrar** (caso de uso + `PATCH /accounts/:code`) y **búsqueda** que
   abra las ramas con coincidencias.
4. **Contrato compartido** (un paquete con los tipos y esquemas) para no
   duplicar reglas entre API y front, y documentación OpenAPI.

## Cómo se trabajó

Usé tres subagentes definidos en `.claude/agents/`: un **arquitecto** (solo
lectura) que diseñó el contrato de API y repartió el trabajo, y dos
implementadores (**backend-nestjs** y **frontend-react**) que trabajaron en
paralelo sobre ese contrato. Revisé lo que entregó cada uno, corrí de nuevo las
pruebas y probé los flujos en el navegador.
