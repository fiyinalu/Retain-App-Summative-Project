# Retain — Personal Expense & Budget Manager

Retain is a full-stack web application that helps users record personal expenses, manage monthly budgets, and understand their spending habits. It includes a personal dashboard for tracking finances and an administrator dashboard for managing expense categories and viewing platform-wide statistics.

**Live application:** https://retain-app.onrender.com
**Backend API:** https://retain-api-5f5b.onrender.com
**Interactive API documentation:** https://retain-api-5f5b.onrender.com/docs

## Features

### Personal finance
- Register an account, sign in, and sign out.
- View a personal dashboard with monthly spending and budget summaries.
- Create, view, edit, and delete expenses.
- Search, filter, sort, and paginate expense records.
- Filter expenses by category, payment method, date, and amount.
- Create, update, and delete monthly budgets.
- Track the amount spent, remaining budget, and budget progress.
- Review spending by category and recent expenses.
- Navigate between the dashboard, expenses, budgets, and other available pages using the shared navigation.

### Administrator dashboard
- Access administrator functionality through role-protected routes.
- View registered-user and expense statistics.
- Review total spending and current-month expense counts.
- Examine spending by category, including top and bottom categories.
- Review recent expenses and registered users.
- Create, edit, and delete expense categories.
- Reassign expenses to `Uncategorized` when a category is deleted.

### Authentication and security
- Authenticate users with JSON Web Tokens (JWT).
- Hash passwords before storing them.
- Restrict expenses and budgets to their respective owners.
- Protect administrator operations with backend role checks.
- Assign the standard user role to new registrations by default.

Administrator access should be granted only through a trusted administrative process. The application does not provide an unrestricted public registration process for administrator accounts.

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, CSS |
| Authentication and routing | React Context, protected routes |
| Expense state management | Redux Toolkit |
| Backend API | Python, FastAPI |
| Data validation | Pydantic |
| Database and ORM | PostgreSQL, SQLAlchemy |
| Authentication | JWT, password hashing |
| Deployment | Render |

## Project structure

```text
Retain-App-Summative-Project/
├── backend/
│   ├── app/
│   │   ├── api/          # Authentication, expenses, budgets, categories and admin routes
│   │   ├── core/         # Configuration, database initialization and shared logic
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Request and response schemas
│   │   └── main.py       # FastAPI application entry point
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Shared UI components and application layout
│   │   ├── pages/        # Application pages
│   │   ├── services/     # API communication
│   │   ├── store/        # Redux state management
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

## Getting started locally

### Prerequisites

Install the following before starting:

- Python 3.11 or a compatible version
- Node.js and npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/fiyinalu/Retain-App-Summative-Project.git
cd Retain-App-Summative-Project
```

### 2. Create a PostgreSQL database

Start PostgreSQL and create a database named `retain`.

For example, if PostgreSQL command-line tools are available:

```bash
createdb retain
```

If that command does not work with your PostgreSQL setup, create the database using your preferred PostgreSQL administration tool.

### 3. Set up the backend

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create your local environment file from the example:

```bash
cp .env.example .env
```

Update `backend/.env` with your local PostgreSQL credentials and a strong secret key:

```dotenv
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/retain
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_ORIGIN=http://localhost:5173
```

Replace the example values with your own configuration. Do not commit `.env` or expose database credentials, JWT secrets, or other production secrets.

Start the backend from the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On startup, the application initializes missing database tables and creates the default `Uncategorized` category when needed.

Keep this terminal running.

### 4. Set up the frontend

Open a second terminal and run:

```bash
cd /Users/mac/Retain-App-Summative-Project/frontend
npm install
```

The frontend uses `VITE_API_BASE_URL` to determine the backend API address. For local development, the default API URL is:

```text
http://127.0.0.1:8000
```

To configure it explicitly, create `frontend/.env.local` containing:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown by Vite, usually:

http://localhost:5173

Both the backend and frontend servers must remain running while you use the local application.

## API overview

The backend provides a REST API built with FastAPI.

When the backend is running locally, its interactive documentation is available at:

- **Swagger UI:** http://127.0.0.1:8000/docs
- **OpenAPI schema:** http://127.0.0.1:8000/openapi.json
- **Health check:** http://127.0.0.1:8000/health

### Main routes

| Area | Route | Access |
|---|---|---|
| Authentication | `/api/auth/register` | Public registration |
| Authentication | `/api/auth/login` | Public login |
| Current user | `/api/auth/me` | Authenticated |
| Expenses | `/api/expenses` | Authenticated; user-scoped |
| Categories | `/api/categories` | Authenticated reads; administrator writes |
| Budgets | `/api/budgets` | Authenticated; user-scoped |
| Budget summary | `/api/budgets/summary` | Authenticated |
| Admin insights | `/api/admin/insights` | Administrator only |

Refer to the interactive API documentation for supported HTTP methods, request bodies, response schemas, query parameters, and additional endpoints.

The health-check endpoint returns a healthy status when the API is available.

## Deployment

The application is deployed on Render, with the frontend and backend running as separate services.

- **Frontend:** https://retain-app.onrender.com
- **Backend:** https://retain-api-5f5b.onrender.com
- **API documentation:** https://retain-api-5f5b.onrender.com/docs

### Backend service configuration

Configure the backend web service with:

- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health-check path:** `/health`

Configure these environment variables in the hosting dashboard:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Hosted PostgreSQL connection string |
| `SECRET_KEY` | Strong secret used for authentication |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes |
| `FRONTEND_ORIGIN` | Exact deployed frontend origin |

### Frontend static site configuration

Configure the frontend with:

- **Root directory:** `frontend`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Environment variable:** `VITE_API_BASE_URL`, set to the deployed backend URL without a trailing slash

Ensure that the backend's `FRONTEND_ORIGIN` matches the deployed frontend origin so browser requests are allowed by the CORS configuration.

Production secrets should be stored in the hosting provider's environment settings, not in source code or frontend environment variables.

### Database and administrator setup

Use a PostgreSQL database configured for the deployment environment. The application initializes missing tables at startup; this is not a replacement for database migrations when changing the structure of existing tables.

Administrator privileges should be granted through a trusted, controlled administrative process. Do not expose database credentials or create an unrestricted public endpoint for changing user roles.

## Development checks

### Frontend

Run these commands from the `frontend` directory:

```bash
npm run lint
npm run build
```

The lint command checks the frontend code, while the build command runs the TypeScript build checks and creates the production bundle.

### Backend

Activate the backend virtual environment and run these commands from the `backend` directory:

```bash
python -m compileall -q app
```

This checks Python files for compilation errors. It does not replace integration or functional tests.
