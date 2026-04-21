# Cloud Cost Optimizer Pro (Final Year MERN Project)

This project is a professional-style cloud cost optimization dashboard built for a final year major project demo.

It includes:
- Login page with token-based auth flow (demo users)
- AWS sample data analyzer with resource risk classification
- Optimization levels: `Optimized`, `Moderate`, `Not Optimized`
- Governance metrics, maturity score, and action board with ownership
- Resource-level suggestions and expected monthly savings
- Demo Services Lab to simulate live operations
- Real-time dashboard updates via Server-Sent Events (SSE)
- Separate client website demo page (`/client-store.html`) that triggers live cloud load events

## Tech Stack
- MongoDB (optional, for report persistence)
- Express + Node.js backend
- React (Vite) frontend

## Core Features
- Secure dashboard entry using login API
- Cost optimization engine with rule-based scoring
- FinOps governance signals:
  - Reserved coverage
  - Rightsizing coverage
  - High-risk resource count
  - Idle resource count
- Action board with:
  - Priority
  - Owner
  - Timeline
  - Estimated savings
- Resource deep dive filters (`All`, `Optimized`, `Moderate`, `Not Optimized`)
- Demo service actions:
  - Traffic Spike
  - Order Burst
  - Upload Media
  - Incident Mode
  - Run Optimization
  - Night Idle
- Client website activities:
  - Visit Homepage
  - Search Products
  - Add To Cart
  - Place Order
  - Upload Profile Image
  - Watch Product Video
  - Flash Sale Event
  - Enable Auto-Scaling

## Folder Structure
```text
backend/
  config/db.js
  data/aws-sample.json
  models/AnalysisReport.js
  routes/analyzeRoutes.js
  services/optimizer.js
  server.js
frontend/
  src/App.jsx
  src/main.jsx
  src/styles.css
```

## Installation
```bash
npm install
npm run install:all
```

## Environment
1. Copy backend env:
   ```bash
   Copy-Item backend/.env.example backend/.env
   ```
2. Copy frontend env:
   ```bash
   Copy-Item frontend/.env.example frontend/.env
   ```
3. Optional: set `MONGODB_URI` in `backend/.env` for persistence.

## Run
```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Demo Login
- Email: `admin@beproject.com`
- Password: `admin123`

## API Endpoints
- `GET /api/health` -> service health
- `POST /api/auth/login` -> demo login
- `GET /api/auth/me` -> validate token
- `GET /api/sample` -> raw AWS sample JSON
- `GET /api/analyze` -> protected analysis output
- `POST /api/analyze` -> protected custom analysis
- `GET /api/simulator/actions` -> list available simulation actions
- `GET /api/simulator/state` -> current simulator state + analysis
- `POST /api/simulator/action` -> trigger demo action and update state
- `POST /api/simulator/reset` -> reset simulator to baseline
- `GET /api/website/activities` -> list website user activity actions
- `GET /api/website/state` -> website runtime state + analysis
- `POST /api/website/activity` -> send website user action and update dashboard
- `GET /api/stream?token=...` -> real-time analysis stream (SSE)

## Classification Model
- `Optimized`: score >= 75
- `Moderate`: score 45-74
- `Not Optimized`: score < 45

Signals used:
- CPU utilization
- Idle days
- Savings Plan/Reserved coverage
- Right-sizing status
- Storage utilization
- Outbound data transfer

## Suggested Next Upgrades
- JWT + hashed passwords + real user roles
- AWS CUR ingestion pipeline
- Trend charts for weekly/monthly variance
- Email reports and budget alert workflow

## Demo Flow For External Reviewers
1. Login to the platform.
2. Open `Client Website Demo` tab and launch `/client-store.html` in a new tab.
3. Perform actions as a website user (search, add to cart, place order, upload profile image).
4. Keep dashboard open on `Executive Dashboard`.
5. Show how traffic, service health, cloud cost, and recommendations change in real time.
6. Optionally open `Demo Services Lab` to trigger infra scenarios and compare impact.
