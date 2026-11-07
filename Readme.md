## Backend setup

Laravel 11 + Sanctum, chạy bằng Docker (Apache 2.4, PHP 8.3-FPM, MySQL 8.4).

### Require

- Docker + Docker Compose
- make

### First install

```bash
cd backend
make setup
```

This command:

1. Create `backend/.env` from `backend/.env.example` (if not exists)
2. Build and run containers
3. `composer install`
4. `php artisan key:generate` (if `APP_KEY` nullable)
5. `php artisan migrate --seed`


API run at `http://localhost:8000` (change by `APP_PORT` in `backend/.env`).
MySQL export at `3306` (`FORWARD_DB_PORT`)

`make setup` only run 1 time. Run again will seed add 20 tasks, run `make fresh` if want reset data

### Sample user

| Email | Role | Mật khẩu |
|---|---|---|
| admin@gmail.com | admin | 123123123 |
| user1@gmail.com | user | 123123123 |
| user2@gmail.com | user | 123123123 |

### Other command

Run in folder `backend/`.

| Lệnh | Mô tả |
|---|---|
| `make up` | Run container |
| `make down` | Stop container |
| `make fresh` | Reset all tables, migrate and seed again |
| `make test` | Run test (SQLite in-memory) |
| `make shell` | Open shell in container PHP |
| `make logs` | View log containers |

## Frontend setup
```bash
cd frontend
yarn install
cp .env.example .env
yarn dev
```

URL: http://localhost:5173


## 1. Improve performance of a large GET /api/tasks endpoint when there are 1M+ tasks

- We currently use paginate(). For every request, it runs a count(*) and uses offset, and both get slow with 1M+ records. We should use cursorPaginate()
- Composite index: the query filters by assigned_to and status, excludes soft deletes rows, and orders by created_at DESC, id DESC. So I would add indexes like (assigned_to, status, created_at, id) and (status, created_at, id), then check them with EXPLAIN for query SQL
- A B-tree index cannot work when we find by LIKE '%keywork%', so every search is a full table scan. I would use a fulltext index on title, description
- Eager loading: in current system does not load any relations right now. But example, if we add the assignee user back, I would use with('user:id, name') together with whenLoaded() in the resource, so a page costs 2 query instead
- The list view does not need full description. So select only the needed columns to cuts I/O and payload size
- Per_page is already validated with a max of 100, so nobody can request 1M rows in one request
- Move the cache from the database store to Redis

## 2. Sucure the API:

- Token are stored as SHA-256 hashes in the DB, and logout revokes the token. 
- I use TaskPolicy and UserPolicy + gate,  and OwnerScope so non-admin users only query their own tasks. This prevents user manage the other user's task.
- Every input goes through a FormRequest, plus $fillable on model.
- Use resources (TaskResource / UserResource) decide exactly which fields go out, and $hidden covers password, so internal fields don't leak.
- In login API, I already implement a simple rate limit by using throttle:20,1. It means server receives 20 request per minute. But in the real project, we should set up rate limit on the web server, use the algorithm like token bucket, leaky bucket, fixed window counter, ...
- Password use bcrypt via the hased cast
- SQL Injection: Eloquent and the query builder use parameter binding. The one raw query (orWhereRaw in Searchalbe) still binds the value with ?, and the column names are hard code and pass through wrap(). Rule: never concatenate user input into raw SQL, and never let users choose column names for sort/filter without a whitelist.
- XSS: Laravel returns application/json, and json_encode escapes the output. The real risk is on the frontend: Vue's {{ }} escapes by default, so avoid v-html with user content. Also add X-Content-Type-Options: nosniff and a CSP header.
- Auth token leakage: If the SPA put the token in localstorage, any XSS can steal it. If in the real project, I would resolve this problem by using the following approaches:
  - set short token expiry, HTTPS only, never log Authorization headers
  - switch to Sanctum SPA cookie mode (HttpOnly cookie + CSRF protention)
  - using JWT and store it in cookies (browser)
- Brute force: rate limit for login and return the same generic error message whether the email or the password is wrong
- Leak information via logging: set APP_DEBUG=false in production so stack trace and anv values never reach the client
- CORS: limit list allow origins to the frontend domain, keep the that's value into .env in the backend


## 1. Benefits of using TypeScript in Vue 3 SPA:
- Typos, wrong prop types, or reading task.titel fail at build time. Our build script run vue-tsc type-check before vite build, so a type error blocks the build
- Task ans TaskPayload in types/task.ts mirror the Laravel TaskRourse. The API layer is typed (`http.get<Paginated<Task>>`), so a component calling tasksApi.list() knows the exactly response format
- TaskStatus is derived from TASK_STATUES as const, so the status list and its type can't drift apart. Assigning 'pending' is a complie error
- defineProps / defineEmits with types dive autocomplete in the parent, and passing a wrong prop or a wrong emit payload is an error in the template
- Racfactor safely: renameing a field liek assigned_to shows every place that breaks, across components, store and composables
- Volar plus TS gives autocomplete and inline docs. Types act as living documentation for the next developer
- Composition API really match with TS: `ref<T>`, computed and composables like useAssignees() infer return types automatically, which is much better than the options API + this.
- TS types only exists at compile time. If the backend changes its respoinse, TS will not notice at runtime. For that you would need runtime validation or types generated from an OpenAPI spec

## 2. Strongly type props of component Vue 3:
you can see in file TaskForm.vue, at the row 20, I use type-based `defineProps<{...}>()`. 

- In Vue 3 with `<script setup lang="ts">`, I use `defineProps` with a TS generic. Each prop gets a type, and ? marks it optional. You can see in file TaskForm.vue, at the row 21, here task is optional Task interface, which I define in types/task.ts
- If a parent passes the wrong type, for example :task="123", or forget a required prop, vue-tsc shows an error the the build will fail. I also get autocomplete for props.task.title inside the compoent