# Giftpile

A self-hostable, mobile-first family wishlist application. Manage gift ideas, claim gifts to give, and coordinate family gift-giving with privacy-first claim visibility.

## About

Giftpile lets families collaborate on gift planning without spoilers. Create gift wishlists, claim gifts you want to give, and see real-time coordination with privacy built in—gift owners never see who claimed their items until the reveal date.

## Tech Stack

- **Backend**: Java 25, Spring Boot 4.1.0, Spring Data JPA + Hibernate, Spring Security (session-based auth), Jsoup (OG parsing), Flyway (migrations)
- **Frontend**: React 19, Vite 6, React Router 7, plain CSS with design tokens
- **Database**: SQLite (default), PostgreSQL (opt-in via `DATABASE_URL` env var)
- **Build**: Maven 3.9+ (backend), npm 22 LTS (frontend)
- **Deployment**: Docker & Docker Compose 27+ (multi-stage builds)
- **Testing**: JUnit 5 + Testcontainers (backend), Vitest + React Testing Library + Playwright (frontend)

## Prerequisites

- **JDK 25** (Temurin or Eclipse)
- **Node 22 LTS** (for frontend development)
- **Maven 3.9+** (for backend development)
- **Docker 27+** & **Docker Compose 27+** (for containerized deployment)

Note: Docker and Docker Compose are only required if using the Docker Compose run mode. Local development and standalone fat-jar modes work with just JDK 25, Node 22, and Maven 3.9+.

## Running Giftpile

Choose one of three run modes based on your needs:

### 1. Docker Compose (Recommended for Production / Easy Setup)

Run the entire stack in containers with a single command:

```bash
docker compose up
# Open http://localhost:8080
```

Frontend will rebuild on code changes (mounted volume). Backend restarts on code changes (mounted volume).

**Configuration:**
- Giftpile backend: `http://localhost:8080`
- Frontend dev server: `http://localhost:5173` (proxied via backend)
- Database: SQLite in `giftpile.db` (volume-mounted)
- Postgres support: Set `DATABASE_URL` in `docker-compose.override.yml` or pass as environment variable

**Using PostgreSQL:**
```bash
# In docker-compose.override.yml or via environment
DATABASE_URL=jdbc:postgresql://postgres:5432/giftpile?user=giftpile&password=giftpile docker compose up
```

### 2. Local Development (Best for Development)

Run backend and frontend independently for faster iteration and better debugging.

**Backend:**
```bash
cd backend
mvn clean spring-boot:run
# Starts on http://localhost:8080
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
# Starts on http://localhost:5173
# Proxies API calls to http://localhost:8080
```

The frontend dev server will auto-reload on code changes. Backend requires a manual restart (Ctrl+C, re-run mvn command) unless using a hot-reload tool like Spring Boot DevTools.

**Configuration:**
- Default database: SQLite at `giftpile.db`
- For Postgres:
  ```bash
  export DATABASE_URL=jdbc:postgresql://localhost:5432/giftpile?user=giftpile&password=giftpile
  cd backend && mvn clean spring-boot:run
  ```

### 3. Standalone Fat JAR (Production / Single-Server Deployment)

Build and run as a single executable JAR with embedded frontend:

```bash
# Build backend (includes bundled frontend)
cd backend
mvn clean package -Pprod

# Run the fat JAR
java -jar target/giftpile-app.jar
# Open http://localhost:8080
```

Frontend is embedded and served from the JAR. No separate npm process needed.

**Configuration:**
- Giftpile: `http://localhost:8080`
- Database: SQLite in `giftpile.db` (same directory as JAR)
- For Postgres:
  ```bash
  export DATABASE_URL=jdbc:postgresql://localhost:5432/giftpile?user=giftpile&password=giftpile
  java -jar target/giftpile-app.jar
  ```

## Database Configuration

Giftpile supports SQLite (default, zero-config) and PostgreSQL (opt-in).

**SQLite (Default):**
- No configuration needed.
- Database file: `giftpile.db` in the working directory.
- Good for single-user or small deployments.

**PostgreSQL:**
Set the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL=jdbc:postgresql://localhost:5432/giftpile?user=giftpile&password=giftpile
```

Then start Giftpile using any of the three run modes above. The application will auto-create tables on first run via Flyway migrations.

## First Run

Giftpile requires at least one admin user to bootstrap. The pre-login screen is empty until users are created. Choose one of these methods:

### Option 1: Bootstrap via API (Recommended)

The `POST /api/admin/bootstrap` endpoint creates the first admin user. It is only available when no users exist.

```bash
curl -X POST http://localhost:8080/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "password": "secure_password_here",
    "isAdmin": true
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Alice",
  "color": "#4C5FE8",
  "isAdmin": true
}
```

Then visit `http://localhost:8080` and sign in.

### Option 2: Seed via SQL (Docker / CI)

For Docker Compose or CI/CD pipelines, add seed data directly in an init SQL script:

```sql
INSERT INTO users (name, password_hash, is_admin, color)
VALUES (
  'Alice',
  '$2a$10$...',  -- bcrypt hash of your password
  true,
  '#4C5FE8'
);
```

To generate a bcrypt hash, use:
```bash
# With Java (using Spring Security's BCryptPasswordEncoder)
cd backend
mvn exec:java -Dexec.mainClass="com.giftpile.util.PasswordHasher" -Dexec.args="your_password"

# Or use an online bcrypt generator (not recommended for production)
```

Then place the SQL in a Flyway migration (e.g., `V2__seed_admin.sql`) and deploy.

### Why Bootstrap?

The app has no default credentials. The pre-login screen displays zero users until at least one is created. The bootstrap endpoint ensures secure, intentional setup:
- Only works when the database is empty (no users exist)
- Returns 403 if users already exist
- The first user should always be an admin (they manage others via the Admin panel)

Once the first admin is created, additional users can be added via the Admin panel (`/admin` route). The Admin panel provides a web UI for:
- Adding new family members (with auto-assigned avatar colors)
- Editing user names and passwords
- Deleting users (with cascading removal of their gifts and claims)
- Promoting/demoting admin status

## Testing

**Backend Unit Tests (SQLite in-memory):**
```bash
cd backend && mvn test
```

**Backend Integration Tests (Testcontainers + PostgreSQL):**
```bash
cd backend && mvn test -Pintegration
```

**Frontend Unit Tests:**
```bash
cd frontend && npm test
```

**Frontend E2E Tests (Playwright):**
```bash
cd frontend && npx playwright test
```

## Project Structure

```
backend/                     # Spring Boot REST API
├── src/main/java/com/giftpile/
│   ├── entity/             # JPA entities
│   ├── repository/         # Data access
│   ├── service/            # Business logic
│   ├── controller/         # REST endpoints
│   └── config/             # Spring Security
├── src/main/resources/db/migration/
│   └── V1__init.sql        # Flyway schema
└── pom.xml

frontend/                    # React + Vite app
├── src/
│   ├── screens/            # Pages
│   ├── components/         # Reusable UI
│   ├── contexts/           # Auth state
│   └── tokens.css          # Design system
├── index.html
├── vite.config.js
└── package.json
```

## Features

- **User Accounts**: Family member login, admin role for user management.
- **Gift Ideas**: CRUD with metadata (link, price, notes), flags (exact color/product, repeatable).
- **Claiming**: Claim gifts with date, date-based auto-reveal for non-repeatable gifts.
- **Privacy**: Gift owner never sees claim data; other viewers' claims hidden until revealed.
- **Responsive**: Mobile-first design, pixel-perfect to handoff tokens.

## API Endpoints

- `POST /api/auth/login` — Login
- `GET /api/auth/users` — List users
- `GET /api/users/{id}/gifts` — List gifts (visibility rules applied)
- `POST /api/gifts` — Create gift
- `POST /api/gifts/{id}/claim` — Claim gift
- `GET /api/admin/users` — List users (admin only)

See full API docs in CLAUDE.md.

## License

MIT
