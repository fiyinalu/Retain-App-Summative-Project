# Retain — Personal Expense & Budget Manager

Retain is a full-stack web application for tracking personal expenses, managing monthly budgets, and understanding spending habits. It also includes an administrator dashboard for managing categories and viewing platform-wide insights.

## Features

### User features
- Register, sign in, and sign out.
- View a personal spending dashboard.
- Create, view, edit, and delete expenses.
- Search, filter, and sort expenses.
- Filter expenses by category, payment method, date, and amount.
- Paginate expense lists.
- Create, update, and delete monthly budgets.
- View monthly spending, remaining budget, and budget status.
- Review spending by category and recent expenses.

### Administrator features
- Access a role-protected admin dashboard.
- View registered-user and expense statistics.
- Review total spending and current-month expense counts.
- View spending by category, including top and bottom categories.
- Review recent expenses and registered users.
- Create, edit, and delete expense categories.
- Reassign expenses to `Uncategorized` when their category is deleted.

### Security and data handling
- Authentication uses JSON Web Tokens.
- Passwords are hashed before storage.
- Users can access only their own expenses and budgets.
- Administrator operations are protected by backend role checks.
- New registrations receive the standard user role; administrator access must be granted through a trusted administrative process.

## Technology stack

**Frontend**
- React
- TypeScript
- Vite
- React Context for authentication and protected routes
- Redux Toolkit for expense state and related interactions
- CSS for responsive styling

**Backend**
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic
- JWT-based authentication

## Project structure

```text
Retain-App-Summative-Project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   └── schemas/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── types/
│   └── package.json
└── README.md
```

## Local setup

### Requirements
- Python 3.11 or a compatible Python version
- Node.js and npm
- PostgreSQL

### 1. Configure the backend

Open a terminal in the project directory:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `backend/.env` file with your local PostgreSQL database details:

```dotenv
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/retain
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_ORIGIN=http://localhost:5173
```

Replace the database username, password, and secret with your own values. Do not commit `.env` or share production credentials.

Start the backend from the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On startup, the application creates missing database tables and ensures the default `Uncategorized` category exists.

### 2. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

The frontend uses `VITE_API_BASE_URL` to select the backend API. For local development, the default is:

```text
http://127.0.0.1:8000
```

To override it, create `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Keep both development servers running while using the application.

## API documentation

When the backend is running, interactive API documentation is available at:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI schema: `http://127.0.0.1:8000/openapi.json`
- Health check: `http://127.0.0.1:8000/health`

### Main API routes

| Area | Routes | Access |
|---|---|---|
| Authentication | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` | Public or authenticated, depending on route |
| Expenses | `/api/expenses` | Authenticated; user-scoped |
| Categories | `/api/categories` | Authenticated reads; administrator writes |
| Budgets | `/api/budgets` | Authenticated; user-scoped |
| Budget summary | `/api/budgets/summary` | Authenticated |
| Admin insights | `/api/admin/insights` | Administrator only |

See `/docs` for supported HTTP methods, request schemas, query parameters, and response formats.

## Production deployment

The application can be deployed as a frontend static site, a backend web service, and a managed PostgreSQL database.

Suggested hosting:
- Frontend and backend: Render
- PostgreSQL: Neon

### Backend service

Configure the backend service with:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health-check path: `/health`

Set these environment variables in the hosting dashboard:

- `DATABASE_URL`: hosted PostgreSQL connection string
- `SECRET_KEY`: a strong, randomly generated secret
- `ACCESS_TOKEN_EXPIRE_MINUTES`: `30`
- `FRONTEND_ORIGIN`: the deployed frontend origin, including `https://`

### Frontend static site

Configure the frontend site with:

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- `VITE_API_BASE_URL`: the deployed backend base URL, including `https://` and without a trailing slash

After the frontend has been deployed, set `FRONTEND_ORIGIN` on the backend to the exact frontend origin and redeploy the backend.

Use hosted environment-variable settings for production secrets. Never place database credentials or production secrets in frontend variables or commit them to source control.

### Production database and administrator access

Use a separate hosted database and verify that its schema is initialized before accepting users. The application startup creates missing tables, but it does not migrate existing table schemas.

Do not make an administrator account by exposing an unrestricted public registration or role-update endpoint. Grant the initial administrator role through a trusted, controlled database administration process.

### Deployment URLs

- Frontend: _Add deployed URL_
- Backend API: _Add deployed URL_
- API documentation: _Add deployed `/docs` URL_

## Development checks

From the frontend directory:

```bash
npm run lint
npm run build
```

From the backend directory with the virtual environment activated:

```bash
python -m compileall -q app
```

## License

Add the applicable project license here if one is required.
