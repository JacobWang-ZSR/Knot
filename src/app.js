const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 8081;

const SESSION_COOKIE = 'knot_session';
const TRUSTED_COOKIE = 'knot_trusted_device';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const TRUSTED_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

let JSON_PATH = process.env.JSON_PATH || path.join(__dirname, '..', 'data', 'passwords.jason');
let APP_PASSWORD = '123456';
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, '..', 'config', 'config.json');

let configData = {};
const sessionStore = new Map();

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const [key, ...valueParts] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(valueParts.join('='));
    return acc;
  }, {});
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function persistConfig() {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(configData, null, 2));
}

async function loadConfig() {
  try {
    configData = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  } catch (_err) {
    configData = {};
  }

  if (configData.jsonPath) JSON_PATH = configData.jsonPath;
  if (configData.appPassword) APP_PASSWORD = configData.appPassword;
  if (!Array.isArray(configData.trustedDevices)) configData.trustedDevices = [];

  const now = Date.now();
  const before = configData.trustedDevices.length;
  configData.trustedDevices = configData.trustedDevices.filter(device => {
    const expiresAt = Number(device.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });

  if (before !== configData.trustedDevices.length) {
    await persistConfig();
  }
}

function createSession(res) {
  const token = newToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessionStore.set(token, expiresAt);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/'
  });
}

async function createTrustedDevice(res) {
  const rawToken = newToken();
  const now = Date.now();

  configData.trustedDevices.push({
    tokenHash: hashToken(rawToken),
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + TRUSTED_TTL_MS
  });

  await persistConfig();

  res.cookie(TRUSTED_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: TRUSTED_TTL_MS,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function clearTrustedCookie(res) {
  res.clearCookie(TRUSTED_COOKIE, { path: '/' });
}

function validateSession(cookies) {
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;

  const expiresAt = sessionStore.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessionStore.delete(token);
    return false;
  }

  return true;
}

async function validateTrustedDevice(cookies) {
  const rawToken = cookies[TRUSTED_COOKIE];
  if (!rawToken || !Array.isArray(configData.trustedDevices)) {
    return false;
  }

  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  let changed = false;
  let trusted = false;

  configData.trustedDevices = configData.trustedDevices.filter(device => {
    const expiresAt = Number(device.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      changed = true;
      return false;
    }

    if (device.tokenHash === tokenHash) {
      trusted = true;
      device.lastUsedAt = now;
    }

    return true;
  });

  if (changed || trusted) {
    await persistConfig();
  }

  return trusted;
}

async function isAuthenticated(req) {
  const cookies = parseCookies(req);

  if (validateSession(cookies)) {
    return true;
  }

  return validateTrustedDevice(cookies);
}

async function requireAuth(req, res, next) {
  try {
    if (await isAuthenticated(req)) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Auth check failed' });
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/auth/status', async (req, res) => {
  try {
    const authenticated = await isAuthenticated(req);
    if (authenticated) {
      createSession(res);
    }
    res.json({ authenticated });
  } catch (err) {
    console.error('Error checking auth status:', err);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

app.post('/auth', async (req, res) => {
  const { password, rememberDevice } = req.body;
  if (password !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  try {
    createSession(res);
    if (rememberDevice) {
      await createTrustedDevice(res);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error creating auth session:', err);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
});

app.post('/logout', async (req, res) => {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE];
  const trustedToken = cookies[TRUSTED_COOKIE];

  if (sessionToken) {
    sessionStore.delete(sessionToken);
  }

  clearSessionCookie(res);

  const forgetDevice = Boolean(req.body && req.body.forgetDevice);
  if (forgetDevice && trustedToken && Array.isArray(configData.trustedDevices)) {
    const tokenHash = hashToken(trustedToken);
    const before = configData.trustedDevices.length;
    configData.trustedDevices = configData.trustedDevices.filter(device => device.tokenHash !== tokenHash);
    if (configData.trustedDevices.length !== before) {
      await persistConfig();
    }
    clearTrustedCookie(res);
  }

  res.json({ success: true });
});

// GET /passwords - read all passwords
app.get('/passwords', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile(JSON_PATH, 'utf8');
    const passwords = JSON.parse(data);
    res.json(passwords);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Error reading passwords:', err);
      res.status(500).json({ error: 'Failed to read passwords' });
    }
  }
});

// POST /passwords - add new password
app.post('/passwords', requireAuth, async (req, res) => {
  try {
    const newEntry = req.body;
    if (!newEntry.keyName || !newEntry.keyValue || !newEntry.targetName) {
      return res.status(400).json({ error: 'Missing required fields: keyName, keyValue, targetName' });
    }

    let passwords = [];
    try {
      const data = await fs.readFile(JSON_PATH, 'utf8');
      passwords = JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    passwords.push(newEntry);
    await fs.writeFile(JSON_PATH, JSON.stringify(passwords, null, 2));
    res.status(201).json(newEntry);
  } catch (err) {
    console.error('Error adding password:', err);
    res.status(500).json({ error: 'Failed to add password' });
  }
});

// PUT /passwords/:index - update password
app.put('/passwords/:index', requireAuth, async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const newEntry = req.body;
    if (!newEntry.keyName || !newEntry.keyValue || !newEntry.targetName) {
      return res.status(400).json({ error: 'Missing required fields: keyName, keyValue, targetName' });
    }

    let passwords = [];
    try {
      const data = await fs.readFile(JSON_PATH, 'utf8');
      passwords = JSON.parse(data);
    } catch (_err) {
      return res.status(500).json({ error: 'Failed to read passwords' });
    }

    if (index < 0 || index >= passwords.length) {
      return res.status(404).json({ error: 'Password not found' });
    }

    passwords[index] = newEntry;
    await fs.writeFile(JSON_PATH, JSON.stringify(passwords, null, 2));
    res.json(newEntry);
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// DELETE /passwords/:index - delete password
app.delete('/passwords/:index', requireAuth, async (req, res) => {
  try {
    const index = Number(req.params.index);
    if (Number.isNaN(index)) {
      return res.status(400).json({ error: 'Invalid index' });
    }

    let passwords = [];
    try {
      const data = await fs.readFile(JSON_PATH, 'utf8');
      passwords = JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Password file not found' });
      }
      return res.status(500).json({ error: 'Failed to read passwords' });
    }

    if (!Array.isArray(passwords)) {
      return res.status(500).json({ error: 'Invalid password data format' });
    }

    if (index < 0 || index >= passwords.length) {
      return res.status(404).json({ error: 'Password not found' });
    }

    passwords.splice(index, 1);
    await fs.writeFile(JSON_PATH, JSON.stringify(passwords, null, 2));
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting password:', err);
    res.status(500).json({ error: 'Failed to delete password' });
  }
});

// GET /config - get current config
app.get('/config', requireAuth, (req, res) => {
  res.json({ jsonPath: JSON_PATH });
});

// POST /config - update config
app.post('/config', requireAuth, async (req, res) => {
  try {
    const { jsonPath } = req.body;
    if (!jsonPath) {
      return res.status(400).json({ error: 'Missing jsonPath' });
    }

    JSON_PATH = jsonPath;
    configData.jsonPath = jsonPath;
    await persistConfig();

    res.json({ jsonPath });
  } catch (err) {
    console.error('Error saving config:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// GET /files - list files in directory
app.get('/files', requireAuth, async (req, res) => {
  try {
    const requestDir = req.query.dir;
    let dir = requestDir || path.join(__dirname, '..', 'data');
    let resolvedDir = path.resolve(dir);
    try {
      await fs.access(resolvedDir);
    } catch (_accessErr) {
      resolvedDir = path.resolve(path.join(__dirname, '..', 'data'));
    }
    const items = await fs.readdir(resolvedDir, { withFileTypes: true });
    const result = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(resolvedDir, item.name)
    }));
    res.json({ currentDir: resolvedDir, items: result });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// POST /change-password - change app password
app.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (oldPassword !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid old password' });
    }
    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ error: 'New password cannot be empty' });
    }

    APP_PASSWORD = newPassword;
    configData.appPassword = newPassword;
    await persistConfig();

    res.json({ success: true });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

async function startServer() {
  await loadConfig();
  app.listen(PORT, () => {
    console.log(`Knot server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
