# Issue 8 - Frontend Integration, Testing & Polish

Ye project issue 5 ke upar build hai. Search, filter, tests aur UI polish add kiya.

## Features
- Search + category filter + sorting (debounce ke sath)
- Grid aur table view
- Loading / error states
- Vitest tests (auth, form, search)
- Production build ready

## Run kaise kare
```bash
cd frontend
npm install
npm run dev      # dev server
npm test         # tests chalane ke liye
npm run build    # production build
```

Backend port 5001 pe chalna chahiye. Offline pe localStorage demo data use hota hai.

## Tests
```bash
npm test
```

auth.test.jsx, contactForm.test.jsx, searchFilter.test.jsx

## Structure short
- pages/ - login, register, dashboard
- components/ - modals, cards, navbar, filters
- services/ - api, auth, contacts
- hooks/ - useAuth, useToast, useDebounce
- test/ - vitest files
- context/ - auth + toast
