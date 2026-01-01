# Office Time Manager

NFC-based Punch In/Punch Out System with Login & User Profile Settings

## 🚀 Features

- ✅ Login & Registration with JWT Authentication
- ✅ NFC Tag-based Punch In/Out
- ✅ Manual Punch Support
- ✅ User Profile Settings (Timezone, Work Hours, Working Days)
- ✅ Real-time Dashboard with Live Stats
- ✅ Predicted Exit Time Calculation
- ✅ Weekly Summary Reports
- ✅ Admin Panel (User & NFC Tag Management)
- ✅ Punch Edit with Audit Trail
- ✅ PWA Support (Mobile-friendly)

## 📁 Project Structure

```
office-time-manager/
├── backend/                 # Node.js REST API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── server.js       # Entry point
│   └── package.json
│
├── frontend/               # React + Vite PWA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   └── App.jsx         # Main app
│   └── package.json
│
└── package.json            # Root workspace config
```

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs for password hashing
- moment-timezone for time calculations

### Frontend
- React 18 + Vite
- TailwindCSS
- Zustand (State Management)
- React Router v6
- Lucide React (Icons)
- React Hot Toast (Notifications)
- PWA Support (vite-plugin-pwa)

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Setup

1. **Clone and Install Dependencies**
```bash
cd office-time-manager
npm run install:all
```

2. **Configure Environment**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
```

3. **Seed Database (Optional)**
```bash
cd backend
npm run seed
```

4. **Start Development Servers**
```bash
# From root directory
npm run dev
```

This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

## 🔑 Test Accounts

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| User | john@example.com | password123 |
| User | jane@example.com | password123 |

## 📱 NFC Tags

Test NFC UIDs:
- `NFC001ABC` - John's card
- `NFC002DEF` - Jane's card
- `NFCADMIN01` - Admin's card

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/weekly` - Get weekly summary
- `GET /api/dashboard/stats` - Get quick stats

### Punch
- `POST /api/punch` - Create punch (Manual)
- `POST /api/punch/nfc` - Create punch via NFC
- `PUT /api/punch/:punchId` - Edit punch
- `DELETE /api/punch/:punchId` - Delete punch (Admin)
- `GET /api/punch/history` - Get punch history
- `GET /api/punch/status` - Get current status

### NFC
- `POST /api/nfc/register` - Register NFC tag (Admin)
- `POST /api/nfc/validate` - Validate NFC tag
- `POST /api/nfc/punch` - Quick punch with NFC
- `GET /api/nfc/my-tags` - Get user's tags
- `GET /api/nfc/tags` - Get all tags (Admin)
- `PUT /api/nfc/:tagId/deactivate` - Deactivate tag
- `PUT /api/nfc/:tagId/reactivate` - Reactivate tag

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:userId` - Get user by ID
- `PUT /api/users/profile` - Update own profile
- `PUT /api/users/:userId` - Update user (Admin)
- `DELETE /api/users/:userId` - Deactivate user (Admin)
- `GET /api/users/:userId/dashboard` - Get user dashboard

### Admin
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/stats` - Get system stats

## ⏰ Time Calculation Logic

1. All times stored in **UTC**
2. Display in user's **configured timezone**
3. Total Worked = Sum of (IN → OUT) pairs
4. Open punch (IN without OUT) = Calculate till current time
5. Predicted Exit = Last IN + Remaining Work Time

## 🔒 Security Features

- JWT with refresh tokens
- Password hashing (bcrypt)
- Role-based access control
- Punch edit audit trail
- Double punch prevention (60s cooldown)
- NFC tag validation

## 📊 Database Collections

- `users` - User accounts with profile settings
- `punchlogs` - All punch records
- `nfctags` - Registered NFC tags
- `auditlogs` - System audit trail

## 🌐 PWA Features

- Installable on mobile devices
- Offline-capable (cached assets)
- Push-to-home screen support
- Responsive design

## 📝 License

MIT
