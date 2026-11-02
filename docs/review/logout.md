# Review logout and session revocation

Logout waits for the API to confirm that the session ended. A failed request leaves the confirmation open with a retry message. A lost successful response also offers retry without claiming that logout completed. Repeated clicks send one request while confirmation is pending. The admin menu uses the same confirmed result and reports failures through its existing toast.

## Try it locally

[Logout confirmation](http://localhost:3001/settings/logout) requires the local API on port 3200, frontend on port 3001 and a signed-in account. There is no deployed preview. From the frontend checkout, run `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001` after starting the disposable API.

1. Open the confirmation and choose Cancel. Settings remain signed in, and no sign-out request is sent.
2. Open it again and choose Log out. The confirm and Cancel buttons are disabled while the API responds. Success opens login, and returning to settings requires signing in again.
3. Block the sign-out request in browser developer tools and confirm. The dialog shows a retry message. Remove the block and retry. The API revokes the session before navigation.

The retry message deliberately says that logout could not be confirmed. The browser cannot distinguish an unreachable API from a response lost after the server completed the request.

## Repeat the proof

Use the disposable proof API and seeded demo accounts, without production or shared sessions:

```sh
AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/logout-live.spec.ts
```

Seven scenarios cover connection failure, a response dropped after real API revocation, duplicate clicks, pending controls, retry, protected-route rejection and rejection of the original session token after logout, Cancel preserving the session, public terms/privacy pages, and the admin menu. Desktop and phone requests use the real API. Only the two labelled transport faults are injected. The legal-page checks verify public navigation and rendering; they do not accept an agreement or assess the legal text.

## Design and limits

Current references are [phone confirmation](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1962-32115) and [desktop confirmation](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1787-26130). The old code's `995:7665` node was deleted. Fresh phone context and both screenshots were read. Desktop context timed out; its screenshot and metadata were available.

The dialog uses the current stacked phone actions, desktop action row, solid destructive button and unblurred scrim. The surrounding app still shows settings, while the reference shows a profile background. On the phone, the description wraps and makes the card taller than the reference. Existing navigation, content and typography differences remain visible in the PR comparisons. Failure and pending messages have no separate approved frame. Full authentication/Figma acceptance and whole-source coverage remain open.

No API or database schema changed, and no deployment is verified. Recordings and comparison images are attached to the PR outside Git.
