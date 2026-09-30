# Fleet Maintenance: Solution Notes

This document describes the submitted solution: a REST API and a frontend that uses it. The
original challenge statement is in [README.md](README.md).

## How to run the project

Run the backend and the frontend in two terminals.

### Backend

Requires Python 3.10 or newer.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_fleet      # dummy data and two demo users
python manage.py runserver 0.0.0.0:8000
```

| Address | What it is |
| --- | --- |
| `http://localhost:8000/api/docs/` | Interactive API documentation. Start here. |
| `http://localhost:8000/api/health/` | Health check |
| `http://localhost:8000/admin/` | Django admin site |

No configuration is needed for local development. The variables that can be set are listed in
`backend/.env.example`.

### Frontend

Requires Node.js 24, the version in `frontend/.nvmrc`. With Node 20.9 or 22, use `npm install`
instead of `npm ci`: their npm reads the lock file differently.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend calls the API at `http://localhost:8000/api`. To use
another address, copy `.env.example` to `.env.local` and change `NEXT_PUBLIC_API_BASE_URL`.

### Demo users

`seed_fleet` creates one user for each role.

| Username | Password | Role | Can do |
| --- | --- | --- | --- |
| `manager` | `fleet-demo-2026` | Manager | Read and change everything |
| `viewer` | `fleet-demo-2026` | Viewer | Read only |

These users are for trying the project. The password can be changed with the
`SEED_USER_PASSWORD` variable.

### Seed command

```bash
python manage.py seed_fleet                  # 8 offices, 15 mechanics, 150 vehicles
python manage.py seed_fleet --force          # delete the existing fleet data and seed again
python manage.py seed_fleet --seed 42        # generate the same dataset every time
python manage.py seed_fleet --vehicles 2000 --offices 20 --mechanics 60
```

The generated data deliberately contains the cases that the endpoints have to handle:

- vehicles that were never serviced, and vehicles whose last service is more than a year old
- inactive vehicles, some of them sharing a license plate with an active vehicle
- inactive mechanics
- one vehicle (the first one) with 350 maintenance records

## How to run the tests

```bash
cd backend
python manage.py test            # 89 tests, under a second

cd frontend
npm test                         # 30 unit tests
npm run lint                     # ESLint
npm run format                   # Prettier
npm run typecheck                # TypeScript
npm run build                    # production build
```

The same checks run on every push, in GitHub Actions (`.github/workflows/ci.yml`).

| Tests | What they cover |
| --- | --- |
| `backend/fleet/tests/` | Every endpoint, the business rules, and the number of queries |
| `backend/accounts/tests/` | Login, tokens, logout, roles, rate limit of the login |
| `frontend/lib/*.test.ts` | Renewal of expired tokens, the stored session, error parsing, formatting, the overdue rule |

## API reference

The complete and interactive reference is at `/api/docs/`. It is generated from the code, so it
cannot go out of date. This section is a summary.

All list endpoints are paginated (`page`, `page_size` up to 100) unless stated otherwise.

| # | Requirement | Method and path |
| --- | --- | --- |
| 1 | CRUD | `/api/offices/`, `/api/vehicles/`, `/api/mechanics/`, `/api/maintenance-records/` |
| 2 | Office summary | `GET /api/offices/summary/` (not paginated) |
| 3 | Vehicle search | `GET /api/vehicles/?...` |
| 4 | Vehicle details | `GET /api/vehicles/{id}/` |
| 5 | Vehicle maintenance history | `GET /api/vehicles/{id}/maintenance-history/` |
| 6 | Assign vehicle | `POST /api/vehicles/{id}/assign/` with `{"office_id": 3}` |
| 7 | Mechanic workload | `GET /api/mechanics/workload/` |
| 8 | Vehicles needing maintenance | `GET /api/vehicles/needing-maintenance/` |
| 9 | Duplicate vehicle check | `GET /api/vehicles/duplicate-check/?vin=...&license_plate=...` |

### Authentication

Every endpoint needs a login, except the login itself, the health check and the documentation.

| Method and path | What it does |
| --- | --- |
| `POST /api/auth/login/` | Takes `username` and `password`. Returns `access`, `refresh` and `user`. |
| `POST /api/auth/refresh/` | Takes `refresh`. Returns a new `access`. |
| `POST /api/auth/logout/` | Takes `refresh` and cancels it. |
| `GET /api/auth/me/` | The user of the token |

Requests carry the access token in a header:

```text
Authorization: Bearer <access token>
```

| Role | Read (`GET`) | Change (`POST`, `PUT`, `PATCH`, `DELETE`) |
| --- | --- | --- |
| Manager | Yes | Yes |
| Viewer | Yes | No, the answer is 403 |

### Vehicle search parameters

Every parameter is optional, and they combine with AND.

| Parameter | Meaning |
| --- | --- |
| `office` | Office id |
| `is_active` | `true` or `false` |
| `make`, `model` | Case-insensitive, partial match |
| `maintained_from`, `maintained_to` | Dates (`YYYY-MM-DD`), inclusive |
| `mechanic_certification` | Certification number, case-insensitive exact match |
| `ordering` | `id`, `vin`, `make`, `model`, `year` or `last_maintenance`; prefix with `-` to reverse |

The same parameters also narrow down `needing-maintenance`.

### Reading and writing relations

Related objects are returned nested and written by id, so a client never needs a second request
to show a name:

```json
// response
{"id": 1, "vin": "...", "office": {"id": 6, "name": "Austin Hub", "city": "Austin"}}

// request body
{"vin": "...", "office_id": 6}
```

### Errors

| Status | When |
| --- | --- |
| 400 | Validation failed. The body maps each field to its messages. Invalid filter values are rejected too, instead of being ignored. |
| 401 | There is no token, or it is not valid any more. |
| 403 | The user is logged in but is not allowed to do this. |
| 404 | The resource does not exist. |
| 405 | The method is not allowed on that endpoint. |
| 409 | Deleting a record that others still reference, or a write that lost a race against the database constraints. |
| 429 | Too many requests. The answer says how long to wait. |

## Security

| Measure | How |
| --- | --- |
| Login | JSON Web Tokens. The access token lives 15 minutes, the refresh token 7 days. |
| Logout | The refresh token is cancelled on the server, so a copy of it stops working. |
| Roles | One permission class for the whole API: everybody logs in, only managers change data. |
| Rate limits | 60 requests a minute without login, 1000 with login, and 10 for the login, to slow down password guessing. |
| Settings | Secret key, debug mode, allowed hosts and allowed origins come from environment variables. |
| Safe start | With debug off, the project refuses to start with the development secret key. |
| CORS | Only the origins in `CORS_ALLOWED_ORIGINS` may call the API from a browser. |
| HTTPS | With debug off, requests are redirected to HTTPS and cookies are only sent over it. |

`python manage.py check --deploy` reports no issues when debug is off.

## Frontend

| Screen | Address | Endpoints used |
| --- | --- | --- |
| Login | `/login` | Login |
| Dashboard | `/dashboard` | Office summary, vehicles needing maintenance, mechanic workload, mechanics |
| Vehicles | `/vehicles` | Vehicle search, vehicles needing maintenance, vehicle CRUD, duplicate check |
| Vehicle | `/vehicles/{id}` | Vehicle details, assign vehicle, maintenance record CRUD |
| Offices | `/offices` | Office summary, office CRUD |
| Mechanics | `/mechanics` | Mechanic workload, mechanic CRUD |

The dashboard is the home page. It is built only from endpoints that the challenge asks for: the
numbers, the chart of cost by office, the most overdue vehicles and the busiest mechanics need no
endpoint of their own.

What to look at:

- **Filters live in the URL.** Every filter, the sort order and the page are query parameters of
  the page, with the same names as in the API. A filtered list can be reloaded, bookmarked or
  shared. Opening a vehicle and going back returns to the same search.
- **Text filters wait until the user stops typing** before they change the URL, so typing a make
  sends one request and not one per letter.
- **The list does not jump.** While the next page or filter loads, the current rows stay on the
  screen, dimmed, under a progress bar.
- **Every list handles four states:** loading (placeholder rows), empty (with a way out, such as
  "Clear filters"), error (with the message of the API and "Try again"), and data.
- **Validation messages come from the API** and are shown under the field they belong to, so the
  rules exist in one place only.
- **The vehicle form checks for duplicates while the user types**, and says which field conflicts
  before the form is submitted.
- **Actions that cannot succeed are explained.** A vehicle with maintenance records cannot be
  deleted, so its delete button is disabled and says why.
- **The session renews itself.** When the access token expires, the frontend gets a new one and
  repeats the request. The user notices nothing, and logs in again only after 7 days or a logout.
- **A login returns to the page that was asked for**, including its filters.
- **A viewer sees no control that changes data.** The buttons and the action menus are not
  rendered. This is for clarity only: the API refuses the change whatever the screen shows.
- **One action menu per row**, instead of several buttons. An action that cannot succeed is
  disabled in the menu, with the reason next to it.
- **Overdue vehicles stand out.** A badge in the list, a warning on the vehicle page with a
  button to record the maintenance, and a card on the dashboard. The rule is the same as the API
  uses, so the badge agrees with the "Needs maintenance" filter.
- **Works on a phone.** Below 900 pixels the navigation becomes a menu, lists become cards, the
  filters open in a panel, and forms fill the screen.
- **Light and dark mode.** The choice is remembered, and it is applied before the first paint, so
  a page never flashes the wrong colors.
- **Accessible.** Every icon button has a label for screen readers, the keyboard focus is
  visible, and an automated check (axe) reports no issue on any screen, in both modes.

## Assumptions

1. **The vehicle list is the vehicle search.** Filters are query parameters of
   `GET /api/vehicles/` instead of a separate `/search` endpoint.
2. **"Last 12 months" is a rolling window of 365 days** ending today. **"Current year" is the
   calendar year**, so the mechanic workload starts again from zero every January 1.
3. **Maintenance belongs to the office where the vehicle is now.** The challenge asks the assign
   endpoint to "record only the new office assignment", which I read as: update the vehicle and
   keep no assignment history. As a consequence, moving a vehicle also moves its past maintenance
   costs to the new office in the office summary.
4. **The office summary counts only active vehicles, but adds up the maintenance of all of them.**
   Money spent on a vehicle that was later retired was still spent by that office.
5. **Vehicles needing maintenance: "more than 365 days" is strict.** A vehicle serviced exactly
   365 days ago is not listed yet. Vehicles that were never serviced come first, because they are
   the most overdue.
6. **License plates are unique among active vehicles only.** An inactive vehicle may share a plate
   with an active one, and reactivating a vehicle checks its plate again.
7. **VINs and plates are stored in upper case**, so `abc-123` and `ABC-123` are the same plate. A
   VIN has 17 characters and never contains I, O or Q (ISO 3779). The check digit is not verified,
   because it is only mandatory in North America.
8. **Records with history are not deleted.** Deleting an office that has vehicles, or a vehicle or
   mechanic that has maintenance records, returns 409. The active flag is the way to retire them.
9. **Maintenance records describe work that was done**, so the date cannot be in the future.
10. **An inactive mechanic cannot receive new work**, but the records they already have can still
    be edited.
11. **Mechanic workload lists every mechanic**, including those with no work this year. Ties in the
    number of records are broken by the higher total cost.
12. **The duplicate check reports a VIN conflict against any vehicle, and a plate conflict only
    against active vehicles**, matching the two rules above. It accepts an optional `exclude_id` so
    that an edit form does not report the vehicle as a duplicate of itself.
13. **The frontend covers CRUD for the four resources.** The challenge asks for "the CRUD
    endpoints" without naming the resources. Maintenance records are managed from the page of
    their vehicle, because a record only makes sense next to its vehicle.
14. **Two roles are enough.** The challenge says the API does not need authentication and offers
    JWT as a bonus. I added it with the smallest model of permissions that is useful: some users
    change data and the others read it.

## Tradeoffs

### Costs are JSON numbers

The example in the challenge shows `"maintenance_cost_last_year": 81250.50`, so costs are returned
as numbers (`COERCE_DECIMAL_TO_STRING = False`). They are stored and added up as `Decimal`, and only
converted at the very end. Returning strings would be safer for clients that do arithmetic on
money, and it is what I would choose for a payments API.

### Query performance

| Endpoint | Queries | How |
| --- | --- | --- |
| Office summary | 1 | Conditional aggregates over office → vehicles → records. Each record is on one row, so sums are not inflated; only the vehicle count needs `DISTINCT`. |
| Vehicle list and search | 2 | `select_related` for the office; the last maintenance date is a correlated subquery, evaluated only for the rows of the page. |
| Vehicle details | 2 | `select_related` for the office and one `Prefetch` that loads all records with their mechanics. The count is the same for 3 records or 3,000. |
| Mechanic workload | 2 | Conditional aggregates filtered to the current year. |

In the paginated endpoints one of the two queries is the `COUNT` of the pagination.

These numbers do not include the login: every request makes one more query, to load the user of
the token. The token itself is verified with its signature, without the database.

The maintenance filters of the vehicle search use a single `EXISTS` subquery rather than a join.
This has two effects: a vehicle with several matching records is returned once, and the date range
and the mechanic have to match **the same record**. Searching for "mechanic X between A and B"
returns vehicles that X serviced in that period, not vehicles that X serviced at some point and
that somebody else serviced in that period.

Two indexes support these queries: `(vehicle, -maintenance_date)` for the history and the last
maintenance date, and `(mechanic, maintenance_date)` for the workload.

The tests assert the number of queries of these endpoints, so an accidental N+1 fails the build.

### Validation in the serializer and in the database

The license plate rule is a partial unique constraint in the database and also a check in the
serializer. The serializer produces the readable 400 response. The constraint protects against two
requests that pass validation at the same moment, in which case the second one gets a 409.

### The vehicle details return the complete history

The challenge asks for the complete history in the details, so it is not paginated there. The
response for a vehicle with 350 records is about 90 KB. For clients that want pages, the
maintenance history endpoint returns the same records paginated.

### The role is the `is_staff` flag

A manager is a user with `is_staff`. It needs no extra table and no extra query. The cost is that
the flag also lets the user open the login of the admin site, where they see nothing without
further permissions. With more than two roles I would use the groups and permissions of Django.

### The tokens are stored in localStorage

It is simple, and it survives a reload. The weakness is that a script injected into the page could
read the tokens. Three things limit the damage: React escapes what it renders, the access token is
short, and a logout cancels the refresh token. The stronger option is a cookie that JavaScript
cannot read (`HttpOnly`), which needs protection against CSRF and the API and the frontend on the
same site.

### Rate limits are counted in memory

The counters are in the cache of the process. With several processes, each one would count on its
own, so production needs a shared cache such as Redis. It is a change of settings, not of code.

### Frontend: refresh everything after a change

After any create, update or delete, every list on the screen is loaded again. It is more requests
than strictly needed, but the data is connected: recording a maintenance changes the vehicle, the
summary of its office and the workload of the mechanic. Choosing by hand what to refresh is where
stale data bugs come from.

### Frontend: the maintenance history is paged in the browser

The vehicle page uses the vehicle details endpoint, which returns the complete history in one
response, and shows it ten rows at a time. This gives the totals of the vehicle without a second
request. For histories of thousands of records, the page would use the paginated maintenance
history endpoint instead.

### Frontend: dropdowns load up to 100 options

The office and mechanic dropdowns load one page of 100. A larger company would need a dropdown
that searches while the user types.

### Frontend: the page is chosen by the width of the screen

On a phone the lists are cards, and on a computer they are tables. The page asks the browser for
the width and renders one of the two, instead of rendering both and hiding one with CSS. This
halves the elements on the page. It is possible because the pages are only rendered in the
browser, after the session is known, so the server never has to guess the width.

### Frontend: dates use the date picker of the browser

The date fields are native date inputs. The browser shows its own calendar, in the language and
format of the user, and the phone shows its native picker. A date picker library would look the
same everywhere, but it is a large dependency for four fields.

### Not included

- **Assignment history.** Excluded by the challenge. It would be a separate table written by the
  assign endpoint.
- **Deployment.** No Docker image, hosting or HTTPS certificate. The settings are ready for them.
- **PostgreSQL.** The project uses the SQLite database of the scaffold. Nothing in the code depends
  on SQLite; the partial unique constraint and the subqueries work the same way on PostgreSQL. I
  did not add the configuration because I could not test it on my machine.
- **User management.** Users are created with the seed command or in the admin site. There is no
  screen to register or to change a password.
- **Browser tests in the repository.** I tested the screens with a scripted browser session that
  is not part of the repository. With more time I would add it as Playwright tests.

## Changes to the scaffold

- `requirements.txt`: added `django-filter`, `djangorestframework-simplejwt`, `drf-spectacular`
  and `python-dotenv`.
- `settings.py`: added `JSONRenderer` (the scaffold could only render HTML), the filter backends,
  the pagination class and the exception handler. Removed `JSON_UNDERSCOREIZE`, a setting of a
  package that is not installed; the API uses snake_case like the examples in the challenge.
  Replaced `CORS_ALLOW_ALL_ORIGINS` with a list of origins, and the values written in the file
  with environment variables.
- `backend/.gitignore`: added, so the virtual environment, the database and `.env` are not
  committed.
- `frontend/package.json`: added `@mui/material-nextjs` and `@emotion/cache`. Without them the
  HTML rendered by the server does not match what React renders in the browser, and every page
  reports a hydration error. Added `vitest` and `jsdom` for the tests.
- `frontend/prettier.config.mjs`: added `endOfLine: 'auto'`. Git checks the files out with CRLF on
  Windows, and `npm run lint` reported every line of every file.
- `frontend/app/globals.css`: removed the colors of the Next.js template. The Material UI theme
  sets them.
- `frontend/package.json`: added `@mui/icons-material` for the icons and `@mui/x-charts` for the
  chart of the dashboard. Both are from the makers of Material UI, so they follow the same theme.

## Project layout

```text
backend/
  server/            Settings, URLs of the project, health check
  accounts/          Login, tokens, roles
    permissions.py   The permission class of the whole API
    serializers.py   User and login
    views.py         Login, refresh, logout, current user
    tests/
  fleet/             The fleet
    models.py        Models, constraints, indexes, VehicleQuerySet
    serializers.py   Validation and response shapes
    filters.py       Vehicle search and maintenance record filters
    views.py         ViewSets and the custom endpoints
    exceptions.py    Maps database conflicts to 409
    pagination.py    Page size settings
    urls.py          Router
    management/commands/seed_fleet.py
    tests/           One module per resource

frontend/
  app/               One folder per address. Each page only renders its view.
  components/        The views and forms of each screen, and the shared pieces: page header,
                     action menu, badges, dialogs, empty and error states
  components/layout/ Sidebar, top bar, account menu, light and dark switch
  lib/hooks/         Data fetching with React Query, one file per resource, URL state, session
  lib/               API client with token renewal, stored session, theme, types, error parsing,
                     formatting, vehicle rules (overdue)
```
