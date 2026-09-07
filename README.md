# DonRide (PFW Shuttle Tracker)

A real-time shuttle tracking web app built for Purdue University Fort Wayne, 
allowing students to see live shuttle locations on a map and drivers to manage 
their shifts and broadcast GPS location from their mobile devices.

**Built by a team of 5 as part of CS372: Web Development at Purdue Fort Wayne.**
---

## Tech Stack

- **Frontend:** Next.js, React, JavaScript, Tailwind CSS
- **Auth:** Clerk session authentication plus backend-issued JWTs for driver API access
- **Backend:** REST API (Node.js)
- **Database:** MongoDB via Mongoose
- **Real-time:** Ably token-authenticated subscriptions
- **APIs:** Browser Geolocation API


## Contributions

### `hooks/useDriverAPI.js` (Driver API Integration Hook)
- Custom hook handling driver session (JWT authentication, route fetching, shift start/end, and real-time GPS pings)
- Clerk's `useAuth` supplies a verified session token to the backend; the
  backend derives the user identity from that token before issuing its own JWT
  for role-protected driver API access
- API calls have graceful error handling (setting error state and 
  returning null/false rather than throwing). Prevents crashes UI-side when encountering unexpected behaviour

### `pages/driver/page.js` (Driver Console UI)
- Full driver-facing console page using the above hook, as well as `hooks/useGeolocation.js`, which handled pinging the driver's location along their route
- Role-based route protection (redirects non-driver users to the 
  student view on mount using Clerk's `publicMetadata`)
- Sticky mobile bottom bar for shift controls, optimized for 
  touch interaction on handheld devices
- Retry logic handling failed pings, starting at 1s and capping at 30s until success
- Active shift detection on page load via `driverData` state 
  sync

## (Updated) Configuration and Security

- Frontend variables are documented in [frontend/.env.example](frontend/.env.example).
- Backend-only credentials are documented in [backend/.env.example](backend/.env.example).
- The frontend sends Clerk session tokens to the backend for driver login and
  realtime token requests; it does not send a Clerk user ID as proof of identity.
- The permanent Ably API key remains backend-only. The frontend receives a
  short-lived, subscribe-only Ably token through `/api/realtime/token`.
- MongoDB, Clerk, Ably, and Web Push credentials must be supplied before a
  complete local run can be verified. Never commit populated `.env` files.

- Full demo may not be accessable as backend is no longer active
