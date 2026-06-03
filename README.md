# DonRide (PFW Shuttle Tracker)

A real-time shuttle tracking web app built for Purdue University Fort Wayne, 
allowing students to see live shuttle locations on a map and drivers to manage 
their shifts and broadcast GPS location from their mobile devices.

**Built by a team of 5 as part of CS372: Web Development at Purdue Fort Wayne.**
**Demo:** [pfw-shuttle.vercel.app](https://pfw-shuttle.vercel.app/)

## Tech Stack

- **Frontend:** Next.js, React, JavaScript, Tailwind CSS
- **Auth:** Clerk (JWT-based, role-aware)
- **Backend:** REST API (Node.js)
- **Database:** PostgreSQL
- **Real-time:** WebSocket integration
- **APIs:** Browser Geolocation API


## My Contributions

### `hooks/useDriverAPI.js` (Driver API Integration Hook)
- Custom hook handling driver session (JWT authentication, route fetching, shift start/end, and real-time GPS pings)
- Clerk's `useAuth` exchanges a Clerk user ID for a backend JWT 
  token, enabling role-based API access
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


## Notes

- Full source code is in a private repository per course academic integrity 
policy. This repository contains my personal contributions and project 
documentation.

- Full demo may not be accessable as backend is no longer active.
