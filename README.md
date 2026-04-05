# Productivity Web App

A complete full-stack productivity app where users can:

- Sign up and log in securely
- Add tasks with optional details and deadlines
- Mark tasks complete/pending
- Delete tasks
- Persist data in a SQLite database

## Tech stack

- **Backend:** Node.js + Express
- **Views/UI:** EJS + CSS
- **Auth:** Session-based authentication with `express-session`
- **Password security:** `bcryptjs`
- **Database:** SQLite (`sqlite3`)

## Step-by-step build explanation

1. **Project setup**
   - Initialized a Node.js project and added required dependencies.
   - Added scripts to run the app.

2. **Database layer**
   - Created `src/db.js`.
   - Opened a SQLite database file (`data.sqlite`).
   - Added initialization logic for two tables:
     - `users` (name, email, password hash)
     - `tasks` (title, details, deadline, completed, user relation)
   - Added Promise-based helper methods (`run`, `get`, `all`) to simplify async SQL usage.

3. **Authentication middleware**
   - Created `src/middleware/auth.js` with `requireAuth`.
   - Protected private routes (like dashboard and task actions).

4. **Express server and routes**
   - Created `server.js`.
   - Configured EJS views and static assets.
   - Configured body parsing and session handling.
   - Implemented auth routes:
     - `GET/POST /signup`
     - `GET/POST /login`
     - `POST /logout`
   - Implemented task routes:
     - `GET /dashboard` (list user tasks)
     - `POST /tasks` (create task with optional deadline)
     - `POST /tasks/:id/toggle` (toggle complete state)
     - `POST /tasks/:id/delete` (delete task)

5. **UI implementation**
   - Built pages for login, signup, and dashboard in EJS:
     - `views/login.ejs`
     - `views/signup.ejs`
     - `views/dashboard.ejs`
   - Added a clean, modern responsive style in `public/styles.css`.

6. **Data persistence and security behavior**
   - Passwords are hashed with bcrypt before storing.
   - Sessions store logged-in user identity.
   - Each task query is scoped by `user_id` so users only see/manage their own tasks.

## Folder structure

```txt
.
├── package.json               # Project metadata, scripts, dependencies
├── server.js                  # Main Express app, routes, and session setup
├── README.md                  # Documentation and setup guide
├── public/
│   └── styles.css             # UI styling
├── src/
│   ├── db.js                  # SQLite init + Promise query helpers
│   └── middleware/
│       └── auth.js            # Route guard for authenticated pages
└── views/
    ├── dashboard.ejs          # Main app screen (create/list/manage tasks)
    ├── login.ejs              # Login page
    └── signup.ejs             # Sign-up page
```

## How to run

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

```txt
http://localhost:3000
```

## Notes

- This app uses SQLite with a local `data.sqlite` file created automatically on first run.
- For production, set a strong `SESSION_SECRET` environment variable.
