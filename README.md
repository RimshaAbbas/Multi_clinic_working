# MultiCare Clinics — Booking & Appointment Management Web App

A complete, production-ready multi-branch clinic booking platform built with React, Node.js, Three.js, and Tailwind CSS.

---

## Tech Stack

| Layer     | Technologies                                                  |
|-----------|---------------------------------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, React Router v6, Three.js       |
| UI Icons  | Lucide React                                                  |
| HTTP      | Axios (with proxy to backend)                                 |
| Backend   | Node.js, Express, helmet, cors, express-validator, rate-limit |
| ID Gen    | uuid                                                          |
| Storage   | In-memory (swap for PostgreSQL/MongoDB in production)         |

---

## Project Structure

```
Multi_clinic_working/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx      ← Sticky navbar, mobile drawer, active links
│   │   │   │   └── Footer.jsx      ← 4-column footer
│   │   │   └── three/
│   │   │       └── ParticleBackground.jsx  ← Three.js animated particle network
│   │   ├── data/
│   │   │   └── clinicData.js       ← Branches, doctors, specializations, metrics
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        ← Hero, metrics, specializations, CTA
│   │   │   ├── DoctorsPage.jsx     ← Filter by branch + specialty, doctor cards
│   │   │   ├── BookPage.jsx        ← 4-step booking form
│   │   │   └── ContactPage.jsx     ← Branch cards, inquiry form
│   │   ├── utils/
│   │   │   └── api.js              ← Axios instance + typed API helpers
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js              ← Proxies /api → localhost:5000
│   ├── tailwind.config.js
│   └── package.json
│
└── backend/
    ├── data/
    │   └── store.js                ← In-memory store (branches, doctors, appointments)
    ├── routes/
    │   ├── appointments.js         ← POST / GET / PATCH (cancel)
    │   ├── slots.js                ← GET available slots (double-booking prevention)
    │   └── inquiries.js            ← POST contact form
    ├── server.js                   ← Express app entry point
    ├── .env
    └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### 1. Install Dependencies

Open **two terminals**.

**Terminal 1 — Backend:**
```bash
cd Multi_clinic_working/backend
npm install
npm run dev
```
The API starts on **http://localhost:5000**

**Terminal 2 — Frontend:**
```bash
cd Multi_clinic_working/frontend
npm install
npm run dev
```
The app opens on **http://localhost:5173**

---

## Pages & Features

### `/` — Home Page
- Hero with value proposition, branch quick-book panel, trust badges
- Live metrics (branches, doctors, patients served)
- Specializations showcase grid (6 disciplines)
- "Why MultiCare?" feature section
- Featured doctors preview
- Full-width CTA banner

### `/doctors` — Services & Doctors
- Sticky filter bar: filter by **Branch** and **Specialty** simultaneously
- Real-time search by doctor name or specialty
- Doctor cards: avatar initials, rating, qualification, experience, bio, availability
- "Book with Doctor" button pre-fills branch & doctor in the booking flow

### `/book` — Book Appointment (4-step)
| Step | What happens |
|------|-------------|
| 1    | Select a branch location |
| 2    | Filter by specialty, select a doctor |
| 3    | Pick a date; available time slots fetched live from backend |
| 4    | Enter patient name, phone, email, reason; client-side validation |

- Double-booking prevention via backend
- Works offline-first — graceful fallback to mock data if API unavailable
- Confirmation screen with booking reference ID

### `/contact` — Contact
- Quick-contact strip (emergency line, email, hours)
- 3 colour-coded branch cards (address, phone, email, hours, Google Maps link)
- Inquiry form with full validation and success state

---

## Backend API Reference

| Method | Route                              | Description                        |
|--------|------------------------------------|------------------------------------|
| GET    | `/api/health`                      | Server health check                |
| GET    | `/api/slots?doctorId=&date=`       | Available time slots for a doctor  |
| POST   | `/api/appointments`                | Create new appointment             |
| GET    | `/api/appointments`                | List all appointments              |
| GET    | `/api/appointments/:id`            | Get single appointment             |
| PATCH  | `/api/appointments/:id/cancel`     | Cancel an appointment              |
| POST   | `/api/inquiries`                   | Submit contact form inquiry        |
| GET    | `/api/inquiries`                   | List all inquiries                 |

---

## Color Palette

| Token       | Hex       | Usage                          |
|-------------|-----------|--------------------------------|
| Navy        | `#1E3A8A` | Headers, primary CTAs, navbar  |
| Blue        | `#3B82F6` | Secondary accents, links       |
| Light       | `#F8FAFC` | Page background                |

---

## Production Notes

- Replace the in-memory store (`backend/data/store.js`) with a real database.
- Add authentication middleware for admin routes (`GET /api/appointments`, `GET /api/inquiries`).
- Set `NODE_ENV=production` and update `ALLOWED_ORIGIN` in `.env`.
- Build the frontend: `npm run build` (output in `frontend/dist`).
