# Giftpile

A self-hostable, mobile-first family wishlist application. Family members keep gift lists,
secretly claim gifts to give each other, and never spoil the surprise: the list owner never sees
who is giving what, and a gift claimed by someone else disappears from everyone else's view.

## Tech Stack

- **Backend**: Java 25, Spring Boot 4.1, Spring Data JPA + Hibernate 7, Spring Security (session
  auth, BCrypt), Jsoup (product-image scraping)
- **Frontend**: React 19, Vite 6, React Router 7, plain CSS with design tokens
- **Database**: SQLite (default, zero-config) or PostgreSQL (opt-in)
- **Testing**: JUnit 5 + Testcontainers (backend); Vitest + React Testing Library + Playwright (frontend)

## Running Giftpile

### Docker Compose (recommended)

```bash
docker compose up --build
# Open http://localhost:8080
```

The backend serves both the API and the built frontend. Data is stored in a SQLite file on a
named volume, so it survives restarts.

PostgreSQL instead of SQLite:

```bash
docker compose --profile postgres up --build
```

### Local development

Backend (JDK 25 + Maven 3.9+):

```bash
cd backend
mvn spring-boot:run        # http://localhost:8080, creates giftpile.db in backend/
```

Frontend (Node 22 — run `nvm use` in `frontend/` first):

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :8080
```

### Standalone JAR

The Docker build bundles the frontend into the jar. To do the same locally:

```bash
cd frontend && npm run build
mkdir -p ../backend/src/main/resources/static && cp -r dist/* ../backend/src/main/resources/static/
cd ../backend && mvn clean package -DskipTests
java -jar target/giftpile-backend-0.1.0.jar    # http://localhost:8080
```

### Pre-built image (home server)

Every push to `main` publishes a multi-arch image (amd64 + arm64) to the GitHub Container
Registry via `.github/workflows/build-and-publish.yml`, gated on the full test suites.

```bash
docker pull ghcr.io/arpadk/giftpile:latest
```

Minimal `docker-compose.yml` for the server:

```yaml
services:
  giftpile:
    image: ghcr.io/arpadk/giftpile:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: jdbc:sqlite:/app/data/giftpile.db
    volumes:
      - giftpile-data:/app/data
    restart: unless-stopped

volumes:
  giftpile-data:
```

Tags: `latest` (main), `sha-<commit>`, and the tag name for `v*` releases. Note: the first
published package is **private** by default — either make it public (GitHub → repo → Packages →
giftpile → settings → change visibility) or `docker login ghcr.io` on the server with a
read-packages PAT.

## Database

- **SQLite (default)**: no configuration; the database is a `giftpile.db` file in the working
  directory (or `/app/data` on the Docker volume). The schema is created automatically.
- **PostgreSQL**: set both environment variables and start normally:

  ```bash
  export DATABASE_URL='jdbc:postgresql://localhost:5432/giftpile?user=giftpile&password=giftpile'
  export DB_DIALECT='org.hibernate.dialect.PostgreSQLDialect'
  ```

## First run

Open the app — with an empty database the start screen shows a **"Create your admin account"**
form. The first account is always an admin; once it exists, the setup form disappears and further
family members are added through the Admin panel (`/admin`).

(The underlying bootstrap endpoint, `POST /api/auth/users`, only works while no users exist and
returns 403 afterwards — there are no default credentials.)

## Testing

```bash
cd backend && mvn test          # H2-based tests run everywhere; Testcontainers tests need Docker
cd frontend && npx vitest run   # unit tests
cd frontend && npm run e2e      # Playwright (starts both servers; expects seeded users)
```

## Project Structure

```
backend/                     # Spring Boot REST API (Maven)
├── src/main/java/com/giftpile/
│   ├── entity/              # JPA entities (User, Gift, Claim)
│   ├── repository/          # Spring Data repositories
│   ├── service/             # Business rules (visibility, admin guardrails, link previews)
│   ├── controller/          # REST endpoints (request records live here too)
│   ├── exception/           # NotFound/Forbidden/Unauthorized + ApiExceptionHandler
│   └── config/              # Security, SPA fallback
└── src/test/java/           # JUnit tests

frontend/                    # React + Vite app (npm)
├── src/
│   ├── screens/             # Pages (UserSelect, PasswordStep, Home, GiftList, AdminPanel)
│   ├── components/          # UI components (GiftCard, TopBar, bottom-sheet modals)
│   ├── contexts/            # Auth session state
│   ├── lib/api.js           # Fetch wrapper (all API calls go through this)
│   └── tokens.css           # Design tokens
└── src/__tests__/           # Vitest unit tests + Playwright e2e specs

design_handoff_gift_list_app/  # Design reference (prototype + screenshots) — source of truth for visuals
openspec/                      # Spec-driven change management
```

## How the reveal rules work

- A gift can be claimed by one person (unless it's marked *"can give more than once"*).
- The claimer picks a gift date; the day **after** that date the gift automatically counts as
  received.
- The list **owner** never sees claim data — received gifts just move to their "received" section.
- **Other viewers** never see gifts that are claimed by someone else or already received.
- The **claimer** always sees their own claim and can change the date or withdraw it, even after
  the reveal.

## API errors

All error responses share one shape: `{ "message": "..." }` with an appropriate HTTP status
(400/401/403/404/409). The frontend surfaces these messages directly.

## License

MIT
