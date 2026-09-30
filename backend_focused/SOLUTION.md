# Fleet Maintenance: Solution Notes

This document describes the submitted solution: a REST API and a frontend that uses it. The original challenge statement is in
[README.md](README.md).

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
python manage.py seed_fleet      # fills the database with dummy data
python manage.py runserver 0.0.0.0:8000
```

The API is served at `http://localhost:8000/api/`. Opening that address in a browser shows the
browsable API, which lists every resource and lets you try requests without any other tool.

### Frontend

Requires Node.js 20.9 or newer.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend calls the API at `http://localhost:8000/api`. To use
another address, copy `.env.example` to `.env.local` and change `NEXT_PUBLIC_API_BASE_URL`.

### Seed command

```bash
python manage.py seed_fleet                  # 8 offices, 15 mechanics, 150 vehicles
python manage.py seed_fleet --force          # delete the existing data and seed again
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
python manage.py test fleet
```

There are 70 tests. They run against an in-memory SQLite database in under a second.

The frontend has no automated tests. It is checked with:

```bash
cd frontend
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # type check and production build
```

## API reference

All list endpoints are paginated (`page`, `page_size` up to 100) unless stated otherwise.

| # | Requirement | Method and path |
|---|---|---|
| 1 | CRUD | `/api/offices/`, `/api/vehicles/`, `/api/mechanics/`, `/api/maintenance-records/` |
| 2 | Office summary | `GET /api/offices/summary/` (not paginated) |
| 3 | Vehicle search | `GET /api/vehicles/?...` |
| 4 | Vehicle details | `GET /api/vehicles/{id}/` |
| 5 | Vehicle maintenance history | `GET /api/vehicles/{id}/maintenance-history/` |
| 6 | Assign vehicle | `POST /api/vehicles/{id}/assign/` with `{"office_id": 3}` |
| 7 | Mechanic workload | `GET /api/mechanics/workload/` |
| 8 | Vehicles needing maintenance | `GET /api/vehicles/needing-maintenance/` |
| 9 | Duplicate vehicle check | `GET /api/vehicles/duplicate-check/?vin=...&license_plate=...` |

### Vehicle search parameters

Every parameter is optional, and they combine with AND.

| Parameter | Meaning |
|---|---|
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
|---|---|
| 400 | Validation failed. The body maps each field to its messages. Invalid filter values are rejected too, instead of being ignored. |
| 404 | The resource does not exist. |
| 405 | The method is not allowed on that endpoint. |
| 409 | Deleting a record that others still reference, or a write that lost a race against the database constraints. |

## Frontend

| Screen | Address | Endpoints used |
|---|---|---|
| Vehicles | `/vehicles` | Vehicle search, vehicles needing maintenance, vehicle CRUD, duplicate check |
| Vehicle | `/vehicles/{id}` | Vehicle details, assign vehicle, maintenance record CRUD |
| Offices | `/offices` | Office summary, office CRUD |
| Mechanics | `/mechanics` | Mechanic workload, mechanic CRUD |

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

## Tradeoffs

### Costs are JSON numbers

The example in the challenge shows `"maintenance_cost_last_year": 81250.50`, so costs are returned
as numbers (`COERCE_DECIMAL_TO_STRING = False`). They are stored and added up as `Decimal`, and only
converted at the very end. Returning strings would be safer for clients that do arithmetic on
money, and it is what I would choose for a payments API.

### Query performance

| Endpoint | Queries | How |
|---|---|---|
| Office summary | 1 | Conditional aggregates over office → vehicles → records. Each record is on one row, so sums are not inflated; only the vehicle count needs `DISTINCT`. |
| Vehicle list and search | 2 | `select_related` for the office; the last maintenance date is a correlated subquery, evaluated only for the rows of the page. |
| Vehicle details | 2 | `select_related` for the office and one `Prefetch` that loads all records with their mechanics. The count is the same for 3 records or 3,000. |
| Mechanic workload | 2 | Conditional aggregates filtered to the current year. |

In the paginated endpoints one of the two queries is the `COUNT` of the pagination.

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

### Not included

- **Assignment history.** Excluded by the challenge. It would be a separate table written by the
  assign endpoint.
- **Authentication.** Optional in the challenge and left out to spend the time on the required
  endpoints and their tests.
- **Automated frontend tests.** I tested the screens by hand and with a scripted browser session
  that is not part of the repository. With more time I would add Playwright tests for the search
  and the vehicle form.
- **PostgreSQL.** The project uses the SQLite database of the scaffold. Nothing in the code depends
  on SQLite; the partial unique constraint and the subqueries work the same way on PostgreSQL.

## Changes to the scaffold

- `requirements.txt`: added `django-filter`.
- `settings.py`: added `JSONRenderer` (the scaffold could only render HTML), the filter backends,
  the pagination class and the exception handler. Removed `JSON_UNDERSCOREIZE`, a setting of a
  package that is not installed; the API uses snake_case like the examples in the challenge.
- `backend/.gitignore`: added, so the virtual environment and the database are not committed.
- `frontend/package.json`: added `@mui/material-nextjs` and `@emotion/cache`. Without them the
  HTML rendered by the server does not match what React renders in the browser, and every page
  reports a hydration error.
- `frontend/prettier.config.mjs`: added `endOfLine: 'auto'`. Git checks the files out with CRLF on
  Windows, and `npm run lint` reported every line of every file.
- `frontend/app/globals.css`: removed the colors of the Next.js template. The Material UI theme
  sets them.

## Project layout

```
backend/fleet/
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
  app/             One folder per address. Each page only renders its view.
  components/      The views, the forms and the shared pieces (dialogs, empty and error states)
  lib/hooks/       Data fetching with React Query, one file per resource, and URL state
  lib/             API client, types, error parsing, formatting
```
