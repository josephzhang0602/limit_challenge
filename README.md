# Fleet Maintenance: take-home submission

This fork contains my solution to the **Fleet Maintenance API** challenge. All of my work is in
[`backend_focused/`](backend_focused/).

| What | Where |
| --- | --- |
| Solution notes: how to run, tests, assumptions, tradeoffs | [backend_focused/SOLUTION.md](backend_focused/SOLUTION.md) |
| The challenge statement | [backend_focused/README.md](backend_focused/README.md) |
| API (Django, Django REST Framework) | [backend_focused/backend/](backend_focused/backend/) |
| Frontend (Next.js, React, Material UI) | [backend_focused/frontend/](backend_focused/frontend/) |

## Quick start

Two terminals. The details are in the solution notes.

```bash
# Terminal 1: API at http://localhost:8000/api/docs/
cd backend_focused/backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_fleet
python manage.py runserver

# Terminal 2: application at http://localhost:3000
cd backend_focused/frontend
npm install
npm run dev
```

Log in as `manager` (can change data) or `viewer` (read only). Both use the password
`fleet-demo-2026`.

## What is included

- The nine requirements of the challenge: CRUD for offices, vehicles, mechanics and maintenance
  records, and the eight reporting and action endpoints.
- A frontend with a dashboard, vehicle search with filters in the URL, vehicle pages with
  maintenance history, offices and mechanics.
- JWT login with two roles, which is the optional bonus of the challenge.
- Tests for the backend and the frontend, run on every push by GitHub Actions.

## The other folder

[`frontend_focused/`](frontend_focused/) is the second challenge of the original repository. I did
not work on it, and it is unchanged.
