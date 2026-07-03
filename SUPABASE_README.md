# MultiCare Clinic Management System (Supabase Edition)

A complete, production-ready single-hospital booking and management platform built with **React 18**, **Supabase**, **Tailwind CSS**, and **Three.js**.

---

## Tech Stack

| Layer       | Technologies                                           |
|-------------|--------------------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, React Router v6, Three.js |
| UI Icons    | Lucide React                                           |
| Backend     | Supabase (PostgreSQL + Realtime + Auth)               |
| Auth        | Supabase Auth with Row Level Security (RLS)           |
| Realtime    | Supabase Realtime (Postgres CDC)                       |

---

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   └── three/
│   │       └── ParticleBackground.jsx  ← Three.js animated particle network
│   ├── context/
│   │   └── AuthContext.jsx            ← Global auth state (useAuth hook)
│   ├── data/
│   │   └── clinicData.js              ← Legacy data (not used in Supabase version)
│   ├── db/
│   │   └── migration.sql              ← RUN THIS IN SUPABASE SQL EDITOR
│   ├── lib/
│   │   └── supabaseClient.js          ← Singleton Supabase client
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx     ← Dashboard shell (sidebar + tabs)
│   │   │   ├── LiveAppointments.jsx   ← Real-time appointment matrix
│   │   │   ├── DoctorSchedules.jsx    ← Doctor CRUD + schedules
│   │   │   ├── StaffProfiles.jsx      ← Staff account listing
│   │   │   └── LabConfigurations.jsx  ← Lab test catalogue
│   │   ├── PatientPortal.jsx          ← Public booking page (/)
│   │   └── AdminLogin.jsx             ← Staff login page (/login)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env                                ← MUST CONFIGURE (see below)
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- A Supabase account (free tier works perfectly)

---

### 1. Create a Supabase Project

1. Go to **https://supabase.com** and sign in (or create an account)
2. Click **"New Project"**
3. Choose a name (e.g., `multi_clinic_working`)
4. Set a strong database password
5. Select a region close to you (e.g., "South Asia (Mumbai)" for Pakistan)
6. Click **"Create new project"** and wait ~2 minutes

---

### 2. Get Your Supabase Credentials

1. In your Supabase Dashboard, click **Settings** (⚙️ icon in sidebar)
2. Click **API** in the left menu
3. Copy:
   - **Project URL** (e.g., `https://jwyywicdrhcrhbglhohg.supabase.co`)
   - **`anon` / `public` key** (the long string under "Project API keys")

---

### 3. Configure the Frontend

Open `frontend/.env` and replace the placeholders:

```bash
VITE_SUPABASE_URL=https://jwyywicdrhcrhbglhohg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here_from_supabase_api_settings
```

---

### 4. Run the Database Migration

1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Open the file `frontend/src/db/migration.sql`
3. **Copy the entire contents** of that file
4. Paste it into the Supabase SQL Editor
5. Click **"Run"** (bottom-right)
6. You should see ✅ Success

This creates 5 tables: `profiles`, `doctors`, `labs`, `appointments`, and sets up RLS + Realtime.

---

### 5. Install Dependencies & Run the App

```bash
cd Multi_clinic_working/frontend
npm install
npm run dev
```

The app will open at **http://localhost:5173**

---

## Application Routes

| Route                 | Description                                          | Access      |
|-----------------------|------------------------------------------------------|-------------|
| `/`                   | Patient Portal — book doctor or lab test            | Public      |
| `/login`              | Staff login                                          | Public      |
| `/admin/dashboard`    | Admin Dashboard (4 tabs)                             | Protected   |

---

## Features

### Patient Portal (`/`)
- Choose between **Doctor Consultation** or **Lab Test**
- Select from live doctor/lab lists pulled from Supabase
- Pick date & time slot
- Fill patient details (name, phone, email optional, reason)
- Submit → stored in Supabase `appointments` table
- Confirmation screen with booking reference ID

### Admin Login (`/login`)
- Staff sign in with **email + password** (Supabase Auth)
- Auto-redirects to dashboard on success
- Password visibility toggle
- Friendly error messages

### Admin Dashboard (`/admin/dashboard`)
Protected by auth guard. Has 4 tabs:

#### 1. **Live Appointments**
- Real-time appointment matrix (subscribes to Supabase Realtime)
- Stats cards: Bookings Today, Pending, Confirmed, Cancelled
- Search by patient name/doctor/phone
- Filter by status
- **Quick Actions:**
  - **Confirm** (pending → confirmed)
  - **Complete** (confirmed → completed)
  - **Cancel** (any → cancelled)
- Changes reflect instantly across all connected dashboards (no page reload)

#### 2. **Doctor Schedules**
- Table of all doctors
- **Add Doctor** modal:
  - Name, specialty, qualification, phone, email
  - Visual schedule grid (select time slots per day)
- Toggle active/inactive status

#### 3. **Staff Profiles**
- Card grid of all staff members from `profiles` table
- Shows name, role badge, join date
- Note: New staff must be invited via **Supabase Auth Dashboard**

#### 4. **Lab Configurations**
- Table of all lab tests
- **Add Lab Test** modal:
  - Name, category, price, turnaround time, description
- Toggle active/inactive status

---

## Row Level Security (RLS)

All tables have **RLS enabled**. Policies:

- **Patients (anon):**
  - Can `SELECT` doctors & labs
  - Can `INSERT` appointments
- **Staff (authenticated):**
  - Full CRUD access on all tables
- **Profiles:**
  - Users can only read/update their own profile row

---

## Realtime Subscriptions

The **Live Appointments** tab subscribes to the `appointments` table:

```js
supabase
  .channel('appointments-live')
  .on('postgres_changes', { event: '*', table: 'appointments' }, callback)
  .subscribe()
```

Any INSERT / UPDATE / DELETE triggers a re-fetch → all connected dashboards update instantly.

---

## Creating Staff Accounts

**Method 1: Supabase Dashboard**
1. Go to **Authentication → Users → Invite User**
2. Enter email
3. User receives a confirmation email and sets a password
4. Their profile row is auto-created via the `handle_new_user()` trigger

**Method 2: SQL**
After a user signs up, update their role in the `profiles` table:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
```

---

## Color Palette

| Token       | Hex       | Usage                          |
|-------------|-----------|--------------------------------|
| Navy        | `#1E3A8A` | Primary CTAs, sidebar, headers |
| Blue        | `#3B82F6` | Secondary accents, links       |
| Light       | `#F8FAFC` | Page background                |

---

## Production Checklist

- [ ] Replace `VITE_SUPABASE_ANON_KEY` with a restricted key if needed
- [ ] Enable **Email confirmation** in Supabase Auth settings
- [ ] Set up **custom SMTP** for branded emails
- [ ] Configure **rate limiting** in Supabase (or use a CDN)
- [ ] Add **analytics** (Supabase offers built-in analytics)
- [ ] Build the frontend: `npm run build` (output in `frontend/dist`)
- [ ] Deploy frontend to **Vercel**, **Netlify**, or **Cloudflare Pages**
- [ ] (Optional) Add **WhatsApp Business API** integration for SMS notifications

---

## Troubleshooting

**Q: I see "Missing environment variables"**  
A: Make sure `frontend/.env` exists and has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.

**Q: "Could not load profiles" error in dashboard**  
A: Check that you ran the `migration.sql` file in the Supabase SQL Editor.

**Q: Real-time not working**  
A: Verify that `ALTER PUBLICATION supabase_realtime ADD TABLE appointments;` ran successfully in the migration.

**Q: How do I invite staff?**  
A: Supabase Dashboard → Authentication → Users → Invite User. Or sign up via the login page and manually update their role in the `profiles` table.

---

## License

MIT

---

Built with ❤️ by Kiro
