const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDb, run, get, all } = require('./src/db');
const { requireAuth } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'local-dev-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null, values: {} });
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).render('signup', {
      error: 'Please fill in all fields.',
      values: { name, email },
    });
  }

  try {
    const existing = await get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).render('signup', {
        error: 'An account with that email already exists.',
        values: { name, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );

    req.session.user = {
      id: result.lastID,
      name: name.trim(),
      email: email.trim().toLowerCase(),
    };

    return res.redirect('/dashboard');
  } catch (error) {
    return res.status(500).render('signup', {
      error: 'Something went wrong. Please try again.',
      values: { name, email },
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null, values: {} });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('login', {
      error: 'Please enter both email and password.',
      values: { email },
    });
  }

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).render('login', {
        error: 'Invalid credentials.',
        values: { email },
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).render('login', {
        error: 'Invalid credentials.',
        values: { email },
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return res.redirect('/dashboard');
  } catch (error) {
    return res.status(500).render('login', {
      error: 'Something went wrong. Please try again.',
      values: { email },
    });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const tasks = await all(
      `SELECT id, title, details, deadline, completed, created_at
       FROM tasks
       WHERE user_id = ?
       ORDER BY completed ASC,
                CASE WHEN deadline IS NULL THEN 1 ELSE 0 END ASC,
                deadline ASC,
                created_at DESC`,
      [req.session.user.id]
    );

    return res.render('dashboard', { tasks, error: null });
  } catch (error) {
    return res.status(500).render('dashboard', { tasks: [], error: 'Failed to load tasks.' });
  }
});

app.post('/tasks', requireAuth, async (req, res) => {
  const { title, details, deadline } = req.body;

  if (!title || !title.trim()) {
    const tasks = await all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.session.user.id]);
    return res.status(400).render('dashboard', {
      tasks,
      error: 'Task title is required.',
    });
  }

  try {
    await run(
      'INSERT INTO tasks (user_id, title, details, deadline) VALUES (?, ?, ?, ?)',
      [
        req.session.user.id,
        title.trim(),
        details ? details.trim() : '',
        deadline && deadline.trim() ? deadline : null,
      ]
    );

    return res.redirect('/dashboard');
  } catch (error) {
    const tasks = await all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.session.user.id]);
    return res.status(500).render('dashboard', {
      tasks,
      error: 'Could not create task. Please try again.',
    });
  }
});

app.post('/tasks/:id/toggle', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);

  try {
    const task = await get('SELECT id, completed FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.session.user.id]);
    if (!task) {
      return res.status(404).send('Task not found.');
    }

    await run('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', [task.completed ? 0 : 1, taskId, req.session.user.id]);
    return res.redirect('/dashboard');
  } catch (error) {
    return res.status(500).send('Failed to update task.');
  }
});

app.post('/tasks/:id/delete', requireAuth, async (req, res) => {
  const taskId = Number(req.params.id);

  try {
    await run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.session.user.id]);
    return res.redirect('/dashboard');
  } catch (error) {
    return res.status(500).send('Failed to delete task.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
