# FlowForge — Team Collaboration & Project Management

FlowForge is a full-stack project management application designed to help teams organize projects and manage tasks in one place.

## Features

- User authentication
- Create, view, update, and delete projects
- Create and manage tasks
- Task status and priority tracking
- Search, filtering, and pagination
- Dashboard with project and task summaries

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM

## Project Structure

```text
FlowForge/
├── client/     # React frontend
├── server/     # Express backend and Prisma
└── README.md
```

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

### 3. Configure environment variables

Create `server/.env` using your local database configuration and the environment variables required by the backend. Never commit `.env` or share database credentials.

### 4. Start the backend

```bash
cd server
npm run dev
```

### 5. Start the frontend

Open another terminal:

```bash
cd FlowForge/client
npm run dev
```

Open the local URL displayed by Vite in your browser.

## Project Status

The initial full-stack implementation is available. Further testing and deployment are ongoing.

## Author

Lakshay Pratap Singh
