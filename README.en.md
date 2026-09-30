# MAX Chat · GREEN-API

A minimal MAX text messenger built with **React 19, strict TypeScript, Tailwind CSS 4 and Feature-Sliced Design**. [Русский README](README.md).

## Run locally

Requires Node **22.13+** (latest Node 22 LTS recommended) and npm. No environment variables or embedded secrets.

```sh
npm ci
npm run dev
```

Open Vite's printed URL (normally `http://127.0.0.1:5173`). To check the production build:

```sh
npm run build
npm run preview
```

Deploy only `dist/` to an HTTPS static host. Preview is a local test server, not a production server.

## Connect a real account

1. Create a **MAX instance**, authorize it in the [GREEN-API console](https://console.green-api.com/).
2. Copy `apiUrl`, `idInstance` and `apiTokenInstance` into the login form. The app checks `getStateInstance`.
3. Set an empty `webhookUrl`, enable `incomingWebhook: yes` and optionally `outgoingWebhook: yes` for delivery statuses. The app does not change instance settings automatically.
4. Enter the recipient's Russian (`+7` plus 10 digits) or Belarusian (`+375` plus 9 digits) phone number. CheckAccount resolves the actual MAX chat ID. Recipient privacy settings may prevent lookup.
5. Send text, then reply from the recipient's MAX app. Enter sends; Shift+Enter inserts a newline. Messages are limited to 4000 characters.
6. Logout cancels requests and removes the session. Reload also clears local history and credentials.

Use one browser tab and a dedicated test instance. The notification queue is shared across consumers. ReceiveNotification is followed by DeleteNotification after processing. Unsupported events are acknowledged to avoid blocking the queue.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run format
```

Vitest and Testing Library cover validation, HTTP contracts, duplicate notifications, acknowledgement failures, backoff, cancellation, concurrent operations, message status races, input errors, IME, safe HTML rendering and the complete user flow. Requests are mocked; tests never send real messages. Coverage thresholds apply to critical API/domain/session logic. CI runs the checks on pushes and pull requests.

For a manual, entirely local fixture, run the development server and open `/tests/browser/`. Use `https://3100.api.green-api.com`, `123`, `fake-token` and phone `+79991234567`. All requests are intercepted and replies are synthetic. `/tests/browser/mobile.html` embeds the same fixture at 390 × 844. These test entry points are excluded from the production build. Do not enter real credentials into the fixture.

## FSD structure

- `app`: application entry, error boundary, Tailwind styles.
- `pages/messenger`: session lifecycle.
- `widgets/messenger`: chat list and conversation layout.
- `features/connect`: instance connection.
- `features/messaging`: chat creation, sending, sequential polling.
- `entities/chat`: message types, event reducer, message list.
- `shared/api`, `shared/lib`, `shared/ui`: validated HTTP client, validation, reusable UI.
- `src/test`: test setup and integration scenarios.

Imports flow down the layers through slice public APIs. Features do not depend on sibling features. The framework-independent session store uses `useSyncExternalStore`; local form state stays in React. A router or global state library would add unnecessary complexity to this single-screen app.

## Decisions and assumptions

- MAX's authenticated conversation layout was unavailable. The app uses a familiar responsive two-panel messenger layout and violet accents; it does not claim pixel-perfect fidelity to an inaccessible screen.
- `apiUrl` is required by the API although the brief only lists the other two credentials. Only HTTPS GREEN-API API hosts are accepted; redirects are rejected.
- Phone validation follows documented CheckAccount restrictions. This is MAX integration, not a WhatsApp substitution.
- Credentials and messages live only in tab memory. No storage, cookies, analytics, secret logging or HTML injection. React escapes user text. A frontend cannot hide a user's API token from their browser; a multi-user product should use a BFF and server sessions.
- Sequential 30-second long polling has a 45-second request timeout, a 250-ms minimum pause, exponential error backoff capped at 30 seconds, cancellation and deduplication. Authorization failures stop automatic retries.
- Successful sending means **queued**, not delivered. Delivery statuses arrive as events, including events received before the send response. Failed network sends are not automatically retried: delivery may be ambiguous. The draft remains available with an explanatory error.
- Chat switching is disabled during sending to preserve a failed draft. Ordinary navigation does not persist drafts. Previous history is not fetched. Attachments, group management, search and editing are out of scope.
- TypeScript 6 satisfies typescript-eslint's `<6.1` peer range; jsdom 29 supports the available Node 22.21.1. Versions are locked without bypassing dependency checks. Other packages use current compatible releases from npm.
- The small single-screen application does not benefit from extra lazy chunks. There are no heavy media assets; Tailwind styles and icons are tree-shaken.

## Verification

See [verification report](docs/VERIFICATION.md) and [requirements](docs/REQUIREMENTS.md). Real MAX delivery, browser CORS and instance-specific limits remain unverified; API behavior is tested with mock HTTP responses based on the documentation.

With more time: Chromium/WebKit E2E, automated accessibility auditing, large-history virtualization, a BFF and cross-tab queue ownership. They are deliberately outside this minimal assignment.

API references (checked September 30, 2026): [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/), [HTTP notifications](https://green-api.com/v3/docs/api/receiving/technology-http-api/), [CheckAccount](https://green-api.com/v3/docs/api/service/CheckAccount/), [request format](https://green-api.com/v3/docs/request-format/).
