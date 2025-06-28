# Voice Notes Task App

A simple fullstack app to manage tasks using voice notes and text, built for hackathons and demos.

---

## Features

- Add, update, delete, and toggle tasks
- Mark tasks as completed using voice commands (fuzzy matching)
- View and clear completed tasks
- Health/status check endpoints
- **No database required** – all data is stored in memory (lost on server restart)

---

## Quick Start

### 1. Backend

**Requirements:** Python 3.8+, FastAPI, Uvicorn

```bash
cd voice-notes-task-app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

**Requirements:** Node.js, Yarn

```bash
cd voice-notes-task-app/frontend
yarn install
yarn start
```

The frontend will run on [http://localhost:3000](http://localhost:3000) and connect to the backend at [http://localhost:8000](http://localhost:8000) by default.

---

## Environment Variables

- **No .env or database setup required for backend.**
- The frontend may use a `.env` file to set `REACT_APP_BACKEND_URL` if you want to point to a different backend URL.

---

## API Endpoints

All backend endpoints are prefixed with `/api`.

- `POST   /api/tasks` – Create a new task
- `GET    /api/tasks` – List all tasks
- `GET    /api/tasks/{task_id}` – Get a specific task
- `PUT    /api/tasks/{task_id}` – Update a task
- `DELETE /api/tasks/{task_id}` – Delete a task
- `POST   /api/tasks/toggle/{task_id}` – Toggle completion
- `POST   /api/tasks/voice-complete` – Complete a task by voice (see below)
- `DELETE /api/tasks/clear-completed` – Clear all completed tasks

**Voice Complete Example:**
```json
POST /api/tasks/voice-complete
{
  "spoken_text": "finish the report"
}
```

---

## Notes

- **All data is lost when the backend restarts.**
- No MongoDB or other database is required.
- Suitable for demos, hackathons, and prototyping.

---

## Deployment

- No database setup needed.
- You can deploy the backend to any platform that supports Python and FastAPI (e.g., Render, Heroku, etc.).
- The frontend can be deployed as a static site (e.g., Vercel, Netlify) or served with Node.js.

---

## License

MIT
