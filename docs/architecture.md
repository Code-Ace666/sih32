# System Architecture — SIH26032

The Smart Farmer Procurement Queue & Tracking Platform is built as a complete full-stack web application designed for the Ministry of Consumer Affairs, Food & Public Distribution.

## Architectural Design

The system implements a monorepo structure with complete separation of concerns between the user interface and the business logic API.

```
                  +-----------------------------------+
                  |        Next.js Frontend           |
                  |     (React/TS/Tailwind CSS)       |
                  +-----------------+-----------------+
                                    |
                        HTTP / WS   | (JSON API)
                                    v
                  +-----------------+-----------------+
                  |        FastAPI Backend            |
                  |        (Python Framework)         |
                  +--------+-----------------+--------+
                           |                 |
            ORM (SQLAlchemy) |                 | WebSocket Broadcast
                           v                 v
                  +--------+--------+  +-----+----------+
                  |  PostgreSQL /   |  | Connection     |
                  |  SQLite DB      |  | Manager        |
                  +-----------------+  +----------------+
```

### Components

1. **Next.js Frontend (Port 3000)**:
   - Uses the React App Router architecture.
   - Designed with Tailwind CSS following official Indian Government digital styling guidelines (large font choices, clean contrast, Ashok wheel accents).
   - Built-in multi-lingual wrapper supporting English and Hindi (`LanguageContext`).
   - Implements a WebSocket channel listener for real-time queue position recalculations. If the WebSocket connection fails, it falls back to a 5-second HTTP polling loop.

2. **FastAPI Backend (Port 8000)**:
   - Uses FastAPI's asynchronous routing modules.
   - Pydantic models validate all incoming requests.
   - Secure authentication via standard SHA-256 PBKDF2 password hashing (pure Python, platform-independent) and JWT session tokens.
   - Custom WebSocket manager groups connections in room-based structures keyed by `centre_id`.

3. **Database Engine**:
   - Production mode: PostgreSQL database with indexes on phone, email, date, and booking token values.
   - Local fallback: SQLite database (`procurement.db` file) with SQL foreign key constraints enabled on connection.

4. **Service Wrappers**:
   - `MockSMSProvider` outputs generated SMS text strings into standard logging streams, which are also stored in the database and pulled by the frontend to mock active GSM devices for judges.
