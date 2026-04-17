# Knot Project - AI Agent Instructions

## Project Overview
This is the "Knot" project, a simple web-based password manager designed to run in a Docker container on a NAS. It provides a web interface to view, search, and add password entries stored in a JSON file on the NAS hard drive.

Key features:
- Web UI with dark/light theme toggle
- Password entries displayed in rounded rectangles (keyName visible, keyValue masked as * until clicked)
- Search functionality (by keyName or targetName)
- Add new password entries
- Data stored in JSON format with fields: keyName, keyValue, targetName, targetUrl, and optional Other_x

See [Feature.md](Feature.md) for detailed requirements.

## Architecture
- **Frontend**: Single-page web app (HTML/CSS/JS) served by a backend server
- **Backend**: Simple server (e.g., Node.js/Express or Python/Flask) handling API endpoints for JSON CRUD operations
- **Data**: Plain JSON file mounted via Docker volume (path configurable)
- **Deployment**: Docker container with exposed port (e.g., 8080)

## Conventions
- JSON data structure: `[{"keyName": "string", "keyValue": "string", "targetName": "string", "targetUrl": "string", "Other_1": "optional"}]`
- No encryption or authentication (personal use only)
- Follow standard web development practices (semantic HTML, accessible UI)

## Build/Test Commands
- Build: `docker build -t knot .`
- Run: `docker-compose up` (after creating docker-compose.yml)
- Test: Manual via browser (load test JSON, verify features)

## Potential Pitfalls
- Security: Plain text passwords - advise users on NAS security
- Data integrity: No backups - recommend atomic writes
- Error handling: Add checks for JSON parsing and file access
- Performance: Inefficient for large JSON files - consider pagination if needed

## Guidance for Agents
- Start with scaffolding: Create Dockerfile, docker-compose.yml, basic server code, and frontend HTML/JS
- Prioritize UI features: Theme toggle, password reveal, search, add form
- Use vanilla JS for simplicity unless a framework is preferred
- Include a test passwords.json file for development
- Add logging and basic error handling
- Ensure cross-browser compatibility and mobile responsiveness</content>
<parameter name="filePath">d:\Workspace\codex\RopeNod\AGENTS.md