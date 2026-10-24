# FlowForge — Team Collaboration & Project Management

FlowForge is a full-stack web application for organizing projects and managing tasks through a centralized dashboard.

**GitHub Repository:** [FlowForge](https://github.com/rajputlakshay0014-wq/FlowForge)

## Features

- User registration and login with JWT authentication
- Create, update, view, and delete projects
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

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rajputlakshay0014-wq/FlowForge.git
cd FlowForge
```

### 2. Install dependencies

```bash
npm install --prefix client
npm install --prefix server
```

### 3. Configure the environment

Create `server/.env` with the database connection and authentication settings required by the backend. Make sure PostgreSQL is available and the database is initialized according to the project's Prisma setup.

**Never commit your `.env` file or expose credentials.**

### 4. Run the backend

```bash
npm run dev --prefix server
```

### 5. Run the frontend

Open a second terminal in the project root:

```bash
npm run dev --prefix client
```

Open the local URL displayed by Vite.

## Testing

Run backend tests:

```bash
npm test --prefix server
```

Build the frontend:

```bash
npm run build --prefix client
```

**Latest verified results:** 40 backend tests passed; frontend production build successful.

## Author

**Lakshay Pratap Singh**

[GitHub Profile](https://github.com/rajputlakshay0014-wq)