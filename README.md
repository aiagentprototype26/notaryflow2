# NotaryFlow

Mobile Notary dispatch board + Apostille tracker + public client intake form, all backed by Firebase Firestore/Storage.

```
Client intake form  →  Mobile Notary dispatched  →  Document notarized
                                                              ↓
                                          One-click → Apostille requested
                                                              ↓
                                                    Shipped to client
```

## What's in here

- **`/` (admin dashboard)** — two tabs: Mobile Notary Dispatch board, and the Apostille Tracker. No login yet (see Security note below).
- **`/intake` (public page)** — send this link to clients. They choose "I need notarization" or "already notarized," fill in their info, optionally upload a PDF, and it lands directly in your Firestore data — no email back-and-forth.
- **Convert button** — on any Completed notary job, one click creates a matching Apostille request, carrying over client name/email/phone/doc type/destination country. Nothing gets retyped.

## 1. Create the Firebase project (~5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it `notaryflow` (or anything) → skip Google Analytics if you don't need it.
2. In the left sidebar: **Build → Firestore Database → Create database** → start in **production mode** → pick a region close to you (e.g. `us-east1` for NYC).
3. In the left sidebar: **Build → Storage → Get started** → production mode → same region.
4. In the left sidebar: **Project settings** (gear icon) → scroll to "Your apps" → click the `</>` (web) icon → register an app (nickname doesn't matter, skip hosting) → copy the `firebaseConfig` values shown.
5. Rules: open `firestore.rules` and `storage.rules` in this repo, copy each into the matching tab in the Firebase console (Firestore → Rules, Storage → Rules), and click **Publish**. These rules have **no authentication** — read the comments at the top of each file before using this with real client data.

## 2. Push this repo to GitHub

```bash
cd notaryflow
git init
git add .
git commit -m "Initial NotaryFlow build"
```

Then on GitHub: create a new repo called `notaryflow` (or whatever you like), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/notaryflow.git
git branch -M main
git push -u origin main
```

## 3. Connect to Netlify

1. Netlify → **Add new site → Import an existing project → GitHub** → pick the `notaryflow` repo.
   (This has to be the GitHub-connected flow, not drag-and-drop — Next.js needs a real build step, unlike the static chavisbids/DCAS sites.)
2. Build settings should auto-detect from `netlify.toml` (`npm run build`, publish `.next`). Netlify will also prompt to install the `@netlify/plugin-nextjs` plugin — accept it.
3. Before the first deploy, go to **Site settings → Environment variables** and add all six keys from `.env.example`, using the values you copied from Firebase step 1.4:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. Deploy. Once it's live, `yoursite.netlify.app` is the admin dashboard and `yoursite.netlify.app/intake` is the public link to send clients.

## 4. Local development (optional)

```bash
npm install
cp .env.example .env.local   # then fill in the same Firebase values
npm run dev
```

## Security — read this before real client use

There is **no login** on the admin dashboard right now, and the Firestore/Storage rules allow anyone to read and write. This was the fast path to get the dispatch board, tracker, and intake form all talking to the same data today. Before you put real client documents and contact info through this:

1. Enable **Firebase Authentication** (email/password or Google sign-in is simplest).
2. Wrap `pages/index.js` in an auth check (redirect to a login page if not signed in).
3. Tighten `firestore.rules` / `storage.rules` so reads/writes to `notaryJobs`, `apostilleRequests`, and `notaries` require `request.auth != null` — the `/intake` page's *create* calls can stay open to the public, but everything else shouldn't be.

Happy to build the login screen and locked-down rules next — just say the word.

## Roadmap (not built yet)

- **Payment collection** — Stripe on the intake form so clients pay the facilitation fee before you start work.
- **Client status portal** — a link clients can check themselves instead of texting you for updates.
