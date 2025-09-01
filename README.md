# AIT — Desafío Artículos (Starter)

**Stack:** Django + DRF + MySQL (Docker), React (Vite) mínimo.  
Incluye **CRUD de artículos** e **importación/exportación Excel**.

- Backend: `http://localhost:8000/api/articles/`
- Frontend: `http://localhost:5173`
- Excel de ejemplo: `samples/ejemplo_articulos.xlsx` (también disponible aparte).

---

## 🚀 Levantar TODO con Docker
> Necesitás [Docker Desktop] instalado.

```bash
# En la raíz del proyecto
docker compose up --build
```
- El backend aplica migraciones automáticamente y queda sirviendo en `:8000`.
- El frontend corre en `:5173` y consume `VITE_API_URL` (por defecto `http://localhost:8000`).

> Si ves un error de conexión al principio, esperá a que la base MySQL termine de levantar (healthcheck).

---

## 📚 Endpoints principales (DRF)
- `GET /api/articles/` → listar (paginado)
- `POST /api/articles/` → crear
- `PUT /api/articles/{id}/` → actualizar
- `DELETE /api/articles/{id}/` → eliminar
- `POST /api/articles/import/` → importar Excel (`multipart/form-data` con campo `file`)
- `GET /api/articles/export/` → exportar Excel

### 🧪 cURL rápido
```bash
# Crear
curl -X POST http://localhost:8000/api/articles/   -H "Content-Type: application/json"   -d '{"code":"T-001","description":"Tijera","price":1999.99}'

# Importar Excel
curl -X POST http://localhost:8000/api/articles/import/   -F "file=@samples/ejemplo_articulos.xlsx"
```

---

## 📥 Formato de Excel para Importar
- Acepta encabezados **en español o inglés** (mayúsculas/minúsculas no importan):
  - `code` **o** `codigo`
  - `description` **o** `descripcion`/`descripción`
  - `price` **o** `precio`
- El resto de las filas son artículos.
- El precio puede ir con **coma o punto** decimal.
- La importación hace **upsert por `code`** (si existe, actualiza).  
- Respuesta: `{ "created": N, "updated": M, "errors": [...] }`

> Tenés un archivo listo: `samples/ejemplo_articulos.xlsx`.

---

## 🧩 Arquitectura y decisiones
- **Django REST Framework** con `ModelViewSet` + acciones personalizadas (`import`, `export`).
- Base de datos **MySQL 8**; driver `mysqlclient`.
- **CORS** habilitado para `http://localhost:5173` (ajustable por env).
- **React + Vite** mínimo para CRUD e import/export sin libs pesadas.
- Imágenes base: `python:3.11-slim` y `node:20-alpine`.

---

## ⚙️ Variables de entorno útiles (backend)
Definidas en `docker-compose.yml`:
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
- `DJANGO_DEBUG` (`1` en dev)

---

## 🛠️ Correr fuera de Docker (opcional)

### Backend (Python 3.10+ y MySQL local)
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows PowerShell
pip install -r requirements.txt
set DB_HOST=localhost && set DB_NAME=app && set DB_USER=app && set DB_PASSWORD=app && set DB_PORT=3306
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```

---

## 🧯 Troubleshooting
- **MySQL tarda en estar listo**: el healthcheck del servicio `db` avisa cuando ya está OK. Si el backend no puede conectarse al inicio, se reintenta al reiniciar el contenedor.
- **CORS**: si consumís desde otro host/puerto, ajustá `CORS_ALLOWED_ORIGINS` en `docker-compose.yml`.
- **Admin Django**: si querés usar `/admin`, creá un superusuario dentro del contenedor:
  ```bash
  docker compose exec backend python manage.py createsuperuser
  ```

---

## 📎 Créditos y licencia
Uso libre para el desafío. Preparado por AIT para facilitar la prueba técnica.
