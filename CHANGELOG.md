# Changelog

## Unreleased — Home Assistant hybrid transport

### Added
- HTTPS/WSS remains the default, with native certificate validation.
- Explicit opt-in HTTP/WS LAN mode for RFC1918 IPv4 and private `.local` names; loopback HTTP stays available.
- Shared URL/DNS policy for Home Assistant REST, WebSocket, reconnects and credential restoration.
- Per-server destination approval, including the resolved IP and exact origin, stored with credentials via Windows DPAPI CurrentUser when the user chooses to remember credentials.
- Node HTTP request implementation with the approved destination bound to each socket, disabled redirects and bounded response/timeout behavior.
- Home Assistant Inspector connection-mode selector, plaintext transport warning and explicit consent checkbox.
- Regression/security tests covering private/public addresses, DNS rebinding, redirect denial, WebSocket peer verification, token failures, and existing TLS behavior.

### Security notes
- HTTP does **not** encrypt tokens or commands, including on private LAN. Use only trusted networks; HTTPS is recommended.
- DNS pinning does not authenticate a plaintext peer cryptographically or protect against an active network-level attacker.
- Invalid HTTPS certificates remain blocked; no TLS verification bypass is provided.

### Verification
- Automated Gate and manual testing on Ulanzi Studio/D200 are required before publication.
- No automatic release or Ulanzi Store publication has been enabled for these changes.
