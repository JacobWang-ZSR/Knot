# Knot Password Manager

Knot is a small self-hosted password manager for personal or home-lab use. It runs as a simple web app and stores password records in a local JSON file, which makes it easy to deploy on a NAS with Docker.

> Security note: this project is designed for private LAN usage. Password records are stored in plain JSON. Do not expose this service directly to the public internet.

## Features

- Login screen with a configurable app password
- View password entries as cards
- Click a masked password to reveal or hide it
- Search by target, username, or URL
- Add and edit password records
- Add custom extra fields
- Light/dark theme toggle
- Select the JSON data file from the web UI
- Docker Compose friendly for NAS deployment

## Project Structure

```text
.
├─ public/                  # Frontend HTML, CSS, and browser JavaScript
├─ src/                     # Node.js/Express backend
├─ data/                    # Local password data directory
├─ config/                  # Local runtime config directory
├─ Dockerfile               # Docker image definition
├─ docker-compose.yml       # NAS/local Docker Compose deployment
├─ package.json             # Node.js project metadata and dependencies
└─ package-lock.json        # Locked dependency versions
```

## Data Format

Password records are stored as an array of JSON objects:

```json
[
  {
    "keyName": "demo_user",
    "keyValue": "demo_password",
    "targetName": "Demo Website",
    "targetUrl": "https://example.com",
    "Other_note": "Optional custom field"
  }
]
```

An example file is provided at `data/passwords.example.jason`.

For real usage, create your private runtime file:

```bash
cp data/passwords.example.jason data/passwords.jason
```

`data/passwords.jason` is ignored by Git so private passwords are not committed by accident.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Open:

```text
http://localhost:8081
```

Default app password:

```text
123456
```

## NAS Docker Deployment

Copy this project folder to your NAS, for example:

```text
/volume1/docker/knot
```

Create your private data file if it does not exist:

```bash
cp data/passwords.example.jason data/passwords.jason
```

Start with Docker Compose:

```bash
docker compose up --build -d
```

Open the app from another device on the same LAN:

```text
http://YOUR_NAS_IP:8081
```

View logs:

```bash
docker compose logs -f knot
```

Stop the service:

```bash
docker compose down
```

## Docker Compose

The included `docker-compose.yml` maps local folders into the container:

```yaml
services:
  knot:
    build: .
    ports:
      - "8081:8081"
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    environment:
      - JSON_PATH=/app/data/passwords.jason
```

This means:

- `./data` stores your password JSON file.
- `./config` stores the app password and selected JSON path.
- Container port `8081` is exposed as NAS/local port `8081`.

## Publishing To GitHub

Before pushing to GitHub, check that private files are not included:

```bash
git status --short
```

These files are intentionally ignored:

```text
node_modules/
data/passwords.jason
config/config.json
config.json
```

Only publish example data such as `data/passwords.example.jason`.

## Libraries Used

- `express`: creates the web server, serves frontend files, and provides API routes such as `/passwords`, `/auth`, and `/config`.
- `fs`: Node.js built-in module used to read and write JSON files.
- `path`: Node.js built-in module used to build safe file paths across Windows, Linux, and Docker.

## Important Security Notes

- Do not put real passwords in files committed to GitHub.
- Do not expose this app directly to the public internet.
- Use it only on a trusted private network unless you add stronger authentication, encryption, HTTPS, and user isolation.
- Back up your `data/passwords.jason` file regularly.
