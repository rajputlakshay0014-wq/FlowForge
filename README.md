# FlowForge — Team Collaboration & Project Management

FlowForge is a full-stack web application for organizing projects and managing tasks through a centralized dashboard.

**GitHub Repository:** https://github.com/rajputlakshay0014-wq/FlowForge

## Features

- User registration and login with JWT authentication
- Create, view, update, and delete projects
- Create and manage project tasks
- Track task status and priority
- Backend validation and user-level authorization
- Dashboard for managing projects and tasks

## Tech Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Validation:** Zod

## Prerequisites

Ensure the following are installed and available:

- Git
- Node.js and npm
- PostgreSQL

PostgreSQL must be running, and you must have valid database credentials.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rajputlakshay0014-wq/FlowForge.git
cd FlowForge
```

### 2. Install dependencies

Run from the project root:

```bash
npm install --prefix client
npm install --prefix server
```

### 3. Create the database

Using your PostgreSQL administration tool or SQL Shell, connect to your PostgreSQL server and create the database:

```sql
CREATE DATABASE flowforge;
```

If the database already exists, continue without creating it again.

### 4. Configure environment variables

Create a file named `.env` inside the `server` directory.

File location:

```text
FlowForge/server/.env
```

Add the following configuration:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/flowforge"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3001
```

Replace `USERNAME` and `PASSWORD` with your PostgreSQL credentials.

Generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`.

Keep `.env` private. Never commit database credentials or JWT secrets to GitHub.

### 5. Initialize Prisma and the database schema

From the project root, run:

```bash
cd server
npx prisma generate --config ./prisma.config.ts
npx prisma migrate deploy --config ./prisma.config.ts
cd ..
```

These commands generate Prisma Client and apply the existing migrations to the configured database.

### 6. Start the backend

From the project root:

```bash
npm run dev --prefix server
```

The backend runs on port `3001` by default.

Keep this terminal open.

### 7. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev --prefix client
```

Open the local URL printed by Vite, usually:

http://localhost:5173

Keep both terminals running while using the application.

## Testing

Run the backend tests:

```bash
npm test --prefix server
```

Build the frontend:

```bash
npm run build --prefix client
```

The project has previously passed 40 backend tests, and the frontend production build has completed successfully. Run these commands to verify the current code.

## Troubleshooting

**Database connection errors**
- Ensure PostgreSQL is running.
- Verify `DATABASE_URL` in `server/.env`.
- Confirm that the `flowforge` database exists.

**Prisma migration errors**
- Confirm that the database connection works.
- Ensure the migration files exist in `server/prisma/migrations`.

**Frontend API errors**
- Ensure the backend is running on port `3001`.
- Verify the API URL in `client/src/App.jsx`.

## Author

**Lakshay Pratap Singh**

GitHub: https://github.com/rajputlakshay0014-wq