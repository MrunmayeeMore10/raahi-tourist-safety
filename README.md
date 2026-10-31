# 🛡️ RAAHI — Smart Tourist Monitoring and Incident Response System

**RAAHI** is a full-stack smart tourist safety platform architected to safeguard domestic and international travelers through automated emergency assistance, real-time location telemetry, multi-factor safety radar, and instant distress response.

---

## 🏛️ System Architecture

The application implements a decoupled, modern enterprise architecture:

```
                      +-----------------------------+
                      |   React + Vite Frontend     |
                      |  (HTML5 / CSS / Bootstrap)  |
                      +--------------+--------------+
                                     |
                                     | HTTP REST / JSON (JWT Authenticated)
                                     v
                      +-----------------------------+
                      |   Spring Boot REST Backend  |
                      |       (Java 17 / Maven)     |
                      +-------+--------------+------+
                              |              |
           Spring Data JPA    |              |   Spring Data MongoDB
                              v              v
               +--------------------+  +--------------------+
               |   SQL Database     |  |      MongoDB       |
               |   (PostgreSQL)     |  |     (Document)     |
               +--------------------+  +--------------------+
               | • User Accounts    |  | • SOS Distress Log|
               | • User Profiles    |  | • Incident Reports |
               | • Trusted Contacts |  | • Live GPS History |
               | • Saved Places     |  | • City Safety Data |
               | • Trip Itineraries |  |                    |
               +--------------------+  +--------------------+
```

---

## 🚀 Technology Stack

### Backend
- **Language**: Java 17 (OpenJDK)
- **Framework**: Spring Boot 3.3.4
- **Web**: Spring Web (RESTful APIs)
- **Security**: Spring Security 6 with BCrypt password hashing, Rate Limiting filter, and JJWT (0.12.6) stateless tokens
- **Relational Persistence**: Spring Data JPA + Hibernate (PostgreSQL 16 / H2 fallback)
- **Document Persistence**: Spring Data MongoDB (MongoDB 7 / 8)
- **Build Tool**: Apache Maven 3.10+
- **Validation**: Jakarta Bean Validation (`@Valid`, `@NotBlank`, `@Email`)

### Frontend
- **Framework**: React 18
- **Language**: JavaScript (ES2022)
- **Build & Dev Tool**: Vite 5
- **Mapping Engine**: Leaflet & React-Leaflet with OpenStreetMap tiles
- **Styling**: Native responsive CSS with emerald/mint visual theme

---

## 🗄️ Database Design

### 1. SQL Database (PostgreSQL) — Relational Records
Stores structured, high-integrity relational entities requiring relational consistency and foreign key isolation:
- `users`: User identity, hashed BCrypt credentials, address, emergency contact numbers, medical notes.
- `emergency_contacts`: Trusted family & friends with name, phone, relationship, and primary flags (`user_id` foreign key).
- `saved_places`: Hotels, meeting points, police/hospital checkpoints with lat/lon (`user_id` foreign key).
- `trips`: Active travel itineraries, return schedules, check-in statuses, and travel notes.

### 2. MongoDB — Document-Oriented Intelligence
Stores high-volume, polymorphic, time-series, or frequently queried safety documents:
- `emergency_events`: Real-time SOS triggers capturing timestamp, coordinates, user details, dispatched emergency hotlines, notified contacts, delivery status, and automated dispatch logs.
- `incident_reports`: Tourist-submitted safety reports, harassment logs, theft advisories, and severity rankings.
- `location_history`: GPS audit trail capturing user movements when location sharing is active.
- `location_safety`: Multi-factor city safety assessments containing weighted safety scores, day/night risks, women traveler ratings, and 90-day hazard news analysis.

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new traveler account with BCrypt hashed password and JWT generation (Rate limited).
- `POST /api/auth/login`: Authenticate via username or email; returns signed JWT bearer token (Rate limited to 10 requests / 60s per IP).

### 👤 Profile (`/api/profile`)
- `GET /api/profile`: Retrieve the authenticated user's profile from PostgreSQL.
- `PUT /api/profile`: Update contact numbers, medical alerts, travel preferences, and address.

### 🚨 Emergency & SOS (`/api/emergency`)
- `POST /api/emergency/sos`: Trigger an immediate emergency distress event. Records in MongoDB, pulls user contacts from SQL, executes automated notification dispatch, and returns hotlines (`112`, `108`, `101`).
- `GET /api/emergency/my-events`: View audit history of user's emergency distress events.

### 👥 Emergency Contacts (`/api/emergency-contacts`)
- `GET /api/emergency-contacts`: List user's trusted contacts ordered by primary status.
- `POST /api/emergency-contacts`: Save a trusted person with contact numbers and relationship.
- `DELETE /api/emergency-contacts/{id}`: Remove a contact.

### 📍 Saved Places (`/api/places`)
- `GET /api/places`: Retrieve user's saved accommodations, meeting points, and pins.
- `POST /api/places`: Save a place with coordinates and categories.
- `DELETE /api/places/{id}`: Delete a saved location.

### 🧳 Trips & Check-Ins (`/api/trips`)
- `GET /api/trips`: List user's upcoming and past trips.
- `POST /api/trips`: Register a travel itinerary.
- `POST /api/trips/{id}/checkin`: Perform a safety check-in, recording telemetry in MongoDB and marking the trip safe.

### 📝 Incident Reporting (`/api/incidents`)
- `GET /api/incidents`: Retrieve safety and incident reports.
- `POST /api/incidents`: Submit an incident report (THEFT, HARASSMENT, MEDICAL, SOS).

### 🌐 City Safety Intelligence (`/api/safety`)
- `GET /api/safety/check?city={city}`: Quantitative multi-factor safety evaluation for a destination city. Unlisted cities receive an honest `verified: false` and `verdict: "Unverified — Local Advisory Required"` status.
- `GET /api/safety/popular`: Pre-computed ratings for global tourist destinations.

### 🗣️ Smart Translation (`/api/translate`)
- `POST /api/translate`: Real-time cross-language translation for emergency phrases and directions.

---

## 🛡️ Security Hardening & Resolved Audit Findings

1. **Strict Git Configuration**:
   - Comprehensive `.gitignore` excluding build artifacts (`target/`, `*.jar`, `*.class`), archives (`*.zip`), IDE metadata (`.idea/`, `.vscode/`), logs, and local environment files.
2. **Production-Enforced JWT Secret**:
   - Configured via `JWT_SECRET`. Production mode mandates a 256-bit (32+ byte) secure secret; development generates an ephemeral HS512 cryptographic key with clear console warnings.
3. **Restricted CORS Policy**:
   - Replaced wildcard origin patterns with strictly whitelisted frontend URLs (`http://localhost:5173`, `http://localhost:5175`, etc.) while securely preserving credentials.
4. **Automated Emergency Dispatch Service**:
   - `EmergencyNotificationService` formats standardized emergency dispatch SMS payloads, logs outbound dispatch telemetry, updates MongoDB delivery status (`DISPATCHED`), and supports outbound webhooks (`SMS_GATEWAY_URL`).
5. **Cross-Device Database Hydration**:
   - On user login/mount, the React frontend automatically fetches contacts, saved places, trips, and incidents from PostgreSQL and MongoDB, guaranteeing cross-device data consistency.
6. **Honest City Safety Assessments**:
   - Unlisted cities are not assigned arbitrary scores; they are marked `verified: false` with explicit travel advisory recommendations.
7. **Authentication Rate Limiting**:
   - `RateLimitFilter` enforces a sliding-window rate limit (10 attempts / 60 seconds per IP) on `/api/auth/login` and `/api/auth/register`, returning HTTP 429 (`Too Many Requests`) with `Retry-After` headers.

---

## ⚙️ How to Run

### 1. Prerequisites
- **Java 17+** (`java -version`)
- **Maven 3.8+** (`mvn -version`)
- **Node.js 18+** (`node -v`)
- **PostgreSQL** running on port 5432 (`createdb raahi`)
- **MongoDB** running on port 27017

### 2. Start Backend (Spring Boot)
```bash
cd raahi-backend
JAVA_HOME=/opt/homebrew/opt/openjdk@17 mvn spring-boot:run
```
*Server runs at `http://localhost:8080`.*  
*Health check:* `http://localhost:8080/api/health`

### 3. Start Frontend (React + Vite)
```bash
# In the root project directory:
npm install
npm run dev
```
*Frontend runs at `http://localhost:5175/` (or `5173`) with backend API proxy.*

---

## 🧪 Testing

```bash
cd raahi-backend
JAVA_HOME=/opt/homebrew/opt/openjdk@17 mvn test
```
*Result: 10 unit and integration tests passing (0 failures, 0 errors).*
