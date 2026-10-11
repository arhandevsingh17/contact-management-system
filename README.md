# Issue 5 - Auth + Routing + Contact Dashboard

React frontend for the contact management app.

## What's done
- Login and Register pages
- Protected routes (need to be logged in)
- Dashboard with contacts list
- Add / Edit / Delete contacts
- Search and category filter
- Stats overview
- Toast notifications
- Auth context + JWT handling (with demo fallback when backend is down)

## How to run
```bash
cd frontend
npm install
npm run dev
```

Make sure backend is running on port 5001 (or set VITE_API_URL in .env).

If backend is offline it falls back to localStorage demo data so you can still test the UI.

## Structure
- `src/pages` - Login, Register, Dashboard, 404
- `src/components` - Navbar, modals, cards, table, etc
- `src/context` - Auth and Toast
- `src/services` - API calls
- `src/hooks` - small custom hooks

Notes:
- Used react-router-dom for routing
- Context for auth so I don't have to prop drill everywhere
- Debounced search so it doesn't lag on every keystroke
