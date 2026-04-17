const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 8081;
let JSON_PATH = process.env.JSON_PATH || path.join(__dirname, '..', 'data', 'passwords.jason');
let APP_PASSWORD = '123456'; // default

// Load config if exists
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, '..', 'config', 'config.json');
async function loadConfig() {
  try {
    const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    if (config.jsonPath) JSON_PATH = config.jsonPath;
    if (config.appPassword) APP_PASSWORD = config.appPassword;
  } catch (err) {
    // Config not found, use default
  }
}

loadConfig();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// GET /passwords - read all passwords
app.get('/passwords', async (req, res) => {
  try {
    const data = await fs.readFile(JSON_PATH, 'utf8');
    const passwords = JSON.parse(data);
    res.json(passwords);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json([]); // Return empty array if file doesn't exist
    } else {
      console.error('Error reading passwords:', err);
      res.status(500).json({ error: 'Failed to read passwords' });
    }
  }
});

// POST /passwords - add new password
app.post('/passwords', async (req, res) => {
  try {
    const newEntry = req.body;
    // Basic validation
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
app.put('/passwords/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const newEntry = req.body;
    // Basic validation
    if (!newEntry.keyName || !newEntry.keyValue || !newEntry.targetName) {
      return res.status(400).json({ error: 'Missing required fields: keyName, keyValue, targetName' });
    }

    let passwords = [];
    try {
      const data = await fs.readFile(JSON_PATH, 'utf8');
      passwords = JSON.parse(data);
    } catch (err) {
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

// GET /config - get current config
app.get('/config', (req, res) => {
  res.json({ jsonPath: JSON_PATH });
});

// POST /config - update config
app.post('/config', async (req, res) => {
  try {
    const { jsonPath } = req.body;
    if (!jsonPath) {
      return res.status(400).json({ error: 'Missing jsonPath' });
    }
    JSON_PATH = jsonPath;
    let config = {};
    try {
      config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    } catch (err) {
      // If config doesn't exist, create it.
    }
    config.jsonPath = jsonPath;
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ jsonPath });
  } catch (err) {
    console.error('Error saving config:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// GET /files - list files in directory
app.get('/files', async (req, res) => {
  try {
    const requestDir = req.query.dir;
    let dir = requestDir || path.join(__dirname, '..', 'data');
    let resolvedDir = path.resolve(dir);
    try {
      await fs.access(resolvedDir);
    } catch (accessErr) {
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

// POST /auth - authenticate
app.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// POST /change-password - change app password
app.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (oldPassword !== APP_PASSWORD) {
      return res.status(401).json({ error: 'Invalid old password' });
    }
    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ error: 'New password cannot be empty' });
    }
    APP_PASSWORD = newPassword;
    // Update config
    let config = {};
    try {
      config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    } catch (err) {
      // If config doesn't exist, create it
    }
    config.appPassword = newPassword;
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.listen(PORT, () => {
  console.log(`Knot server running on port ${PORT}`);
});
