# Buss

A desktop chat app with a quiet sage-and-cream interface, local accounts, a shared common room, and private direct messages.

## Run

Requires Node.js 22.13+ (Node.js 24+ recommended).

```sh
npm install
npm run desktop
```

For browser development, run `npm start` and open http://127.0.0.1:3000.

Create your first account, then use **+ → Create another account** to add someone else. Sign in to either account to send messages. The common room is shared by all local accounts; direct messages are only returned to their participants. Conversations refresh every 2.5 seconds.

## Data and scope

This version supports accounts on one computer. It does not connect different computers or offer email verification/password recovery. Desktop data is stored in Electron's user-data directory; browser-development data is stored in `.data/buss.sqlite`. Set `BUSS_DATA` to override development storage. Passwords are salted and hashed with scrypt. Authentication uses expiring, HttpOnly, SameSite cookies. The desktop renderer runs sandboxed without Node integration; the server binds only to loopback.

## Verify

```sh
npm test
```

Integration tests cover registration, duplicate emails, rejected credentials, session persistence, private-message isolation, shared messages, database persistence, and logout.
