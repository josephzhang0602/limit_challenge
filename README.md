# Fleet Maintenance: take-home submission

This fork contains my solution to the **Fleet Maintenance API** challenge. All of my work is in
[`backend_focused/`](backend_focused/). This page covers what the challenge asks the README to
describe: how to run the project, how to run the tests, the assumptions and the tradeoffs. The
full version of each, with the API reference, is in
[backend_focused/SOLUTION.md](backend_focused/SOLUTION.md).

| What | Where |
| --- | --- |
| Full solution notes | [backend_focused/SOLUTION.md](backend_focused/SOLUTION.md) |
| The challenge statement | [backend_focused/README.md](backend_focused/README.md) |
| API (Django, Django REST Framework) | [backend_focused/backend/](backend_focused/backend/) |
| Frontend (Next.js, React, Material UI) | [backend_focused/frontend/](backend_focused/frontend/) |

## What is included

- **The nine requirements of the challenge:** CRUD for offices, vehicles, mechanics and
  maintenance records, plus office summary, vehicle search, vehicle details, maintenance history,
  assign vehicle, mechanic workload, vehicles needing maintenance and duplicate check.
- **A frontend:** a dashboard, vehicle search with every filter in the URL, vehicle pages with
  their maintenance history, offices and mechanics. It works on a phone and has a dark mode.
- **The optional bonus:** JWT login with two roles. Managers change data, viewers only read it.
- **Tests** for the backend and the frontend, run on every push by GitHub Actions.

## How to run the project

Requires Python 3.10 or newer and Node.js 24. Use two terminals.

```bash
# Terminal 1: the API
cd backend_focused/backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_fleet        # dummy data and two demo users
python manage.py runserver
```

```bash
# Terminal 2: the frontend
cd backend_focused/frontend
npm install
npm run dev
```

| Address | What it is |
| --- | --- |
| `http://localhost:3000` | The application |
| `http://localhost:8000/api/docs/` | Interactive API documentation |
| `http://localhost:8000/api/health/` | Health check |

Log in as `manager` (can change data) or `viewer` (read only). Both use the password
`fleet-demo-2026`.

No configuration is needed for local development. The settings that can be changed are listed
in `backend_focused/backend/.env.example`.

## How to run the tests

```bash
cd backend_focused/backend
python manage.py test            # 89 tests

cd backend_focused/frontend
npm test                         # 30 unit tests
npm run lint
npm run typecheck
npm run build
```

The backend tests cover every endpoint, the business rules, login, roles and rate limits. The
endpoints with a performance requirement also check how many database queries they make, so an
N+1 problem fails the tests. The frontend tests cover the renewal of expired login tokens, the
parsing of API errors, date formatting and the "overdue" rule.

## Assumptions

The challenge leaves some rules open. These are the readings I chose; all 14 are in the
[solution notes](backend_focused/SOLUTION.md#assumptions).

- **"Last 12 months" is the last 365 days.** "Current year" is the calendar year, so the mechanic
  workload starts again from zero on January 1.
- **"Record only the new office assignment"** means the assign endpoint updates the vehicle and
  keeps no history. So moving a vehicle also moves its past maintenance costs to the new office.
- **License plates are unique among active vehicles only.** A retired vehicle may share its plate
  with an active one. VINs are unique among all vehicles.
- **VINs and plates are stored in upper case,** so `abc-123` and `ABC-123` are the same plate.
- **"More than 365 days" is strict:** a vehicle serviced exactly 365 days ago does not need
  maintenance yet. Vehicles that were never serviced come first.
- **Records with history are not deleted.** An office with vehicles, or a vehicle or mechanic with
  maintenance records, cannot be deleted; it can be set to inactive instead.
- **The vehicle list is the vehicle search.** The filters are query parameters of
  `GET /api/vehicles/`, not a separate endpoint.

## Tradeoffs

The main decisions and what they cost. Each one is explained in the
[solution notes](backend_focused/SOLUTION.md#tradeoffs).

| Decision | Benefit | Cost |
| --- | --- | --- |
| Database work stays in a few queries (subqueries, `select_related`, one prefetch) | The vehicle details take 2 queries whether a vehicle has 3 records or 3,000 | The queries are harder to read than simple loops |
| Business rules are checked in the serializer and also in the database | Clear error messages, and no duplicate even when two requests arrive together | The rule is written twice |
| Costs are JSON numbers, as in the example of the challenge | Matches the specification | Clients that do arithmetic on money should use strings |
| Login tokens are stored in the browser (`localStorage`) | Simple, and survives a reload | A script injected into the page could read them; cookies are safer but need more setup |
| Validation messages come from the API only | The rules exist in one place | One request to see an error |
| The frontend refreshes every list after a change | Never shows stale data | More requests than strictly needed |
| SQLite, the database of the scaffold | Runs with no setup | Not for production; the code does not depend on it |

**Not included:** assignment history (excluded by the challenge), deployment, and browser tests
in the repository.

## The other folder

[`frontend_focused/`](frontend_focused/) is the second challenge of the original repository. I did
not work on it, and it is unchanged.
