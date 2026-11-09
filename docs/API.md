# API — Mốc 1

Base URL `http://<IP-LAN>:3000`. JSON object request. Protected calls require
`Authorization: Bearer <access_token>`. Response envelope:
`{code:"1000",message:"OK",data:...}`; errors have an HTTP error status,
a stable `code`, human-readable `message`, and `data:null`.

## Authentication

| Method | Path | Request / response |
|---|---|---|
| GET | /health | Public health check |
| POST | /auth/signup | `first_name,last_name,email,phone,password`; always creates unverified Remote; returns `user_id,account_role,verify_required:true` |
| POST | /auth/otp | `email,purpose` (`signup` or `forgot_password`); returns `purpose,expires_in:300,resend_after:120,delivery` |
| POST | /auth/verify | `email,code` (6-character string); consumes signup OTP and verifies account |
| POST | /auth/login | `email,password,device_id`; requires verified account; returns `user,account_role,access_token,refresh_token,expires_in:900` |
| POST | /auth/refresh | `refresh_token`; rotates tokens, same response as login |
| POST | /auth/logout | Bearer required; revokes only its session family and this device membership |
| POST | /auth/reset-password | `email,code,password`; consumes forgot_password OTP; revokes all sessions and memberships of this account |
| GET | /users/me | Bearer required; `id,email,first_name,last_name,phone,account_role,device_id,room_id` |

`user` is `{id,email,first_name,last_name,phone}`. Passwords are 6–128 characters;
profile names are nonempty, up to 80 characters, phone up to 24 characters.
Passwords are preserved literally, including spaces. Email is trimmed/lowercased.
Unknown role fields cannot elevate permissions. device_id is a nonempty string
up to 200 characters, bound to the account on first login. Another account cannot
claim a device already registered or held by a legacy session/membership.
An account may have multiple devices and independent login sessions.

Access tokens are opaque random secrets stored as SHA-256 hashes, lasting 15 minutes.
Refresh families expire 30 days after login (rotation does not extend the deadline).
Each refresh token is usable once. Reuse revokes its entire family; other login
families remain valid. Logout does not revoke other device sessions. Legacy access
sessions remain valid until their previous expiry; login again to obtain refresh.

OTP is six random digits, expires after 5 minutes, allows five verification attempts,
requires 120 seconds between sends, and cannot be reused or used for another purpose.
Signup first creates the account; OTP send is a separate retryable action. Password
reset exists at API level; its dedicated UI remains for the later account milestone.
Auth POST endpoints have a per-IP limit of 60 requests/minute.

No email/SMS service is bundled. Default send returns HTTP 503
`OTP_DELIVERY_UNAVAILABLE`. `createApp(db,{otpSender:{async send({email,purpose,code,expiresIn}){...}}})`
is the adapter injection interface. A delivery failure returns 503, without claiming success.
For local demo only, set `DEV_OTP_ENABLED=true` in server .env: response then contains
`dev_code` and `delivery:"dev_response"`. Startup rejects this configuration when
`NODE_ENV=production`. Never log OTP, tokens or passwords.

## Rooms

| Method | Path | Permission / behavior |
|---|---|---|
| POST | /rooms | Controller only; returns existing open room or creates one |
| POST | /rooms/join | Remote only; `invite_code,device_id,camera_name,grant_control:true` |
| GET | /rooms/{id}/members | Owner only; `total,members:[{member_id,device_id,camera_name,joined_at}]` |
| POST | /rooms/{id}/leave | Removes only the authenticated user/device membership; repeat is harmless |

Room response: `room_id,invite_code,expires_at` (ISO timestamp). Invite is six uppercase
hex characters, valid for 10 minutes. Opening an expired room renews its deadline,
keeping room ID, code and members. Capacity is 8 devices. Join is idempotent and
requires explicit consent and device_id matching the authenticated session.
Membership removal is consent revocation. Controller QR encodes the raw invite code;
Remote currently accepts manual entry (QR scanning is not implemented).

Only the exact string `"true"` is accepted as a compatibility alternative to JSON
`true` for grant_control. `"false"`, numbers, arrays and null are not truthy consent.
There are no numeric request fields for the implemented routes; timestamps, counts,
and expires_in are returned as JSON numbers, not strings. Extra device_type is ignored.

## Errors

Clients display errors and preserve sessions on network/5xx failures. Only
`401 ACCESS_EXPIRED` triggers a shared refresh and one replay of the failed request.
A rejected refresh clears the session; no refresh loop is allowed.

| HTTP | Codes / meaning |
|---|---|
| 400 | VALIDATION, OTP_INVALID, missing explicit consent |
| 401 | INVALID_CREDENTIALS, ACCESS_EXPIRED, SESSION_EXPIRED, REFRESH_REUSED |
| 403 | VERIFICATION_REQUIRED, DEVICE_OWNERSHIP, wrong account role/device/owner |
| 404 | INVITE_INVALID, account/room/route not found |
| 409 | EMAIL_EXISTS, ROOM_FULL, DEVICE_IN_OTHER_ROOM, already verified |
| 410 | INVITE_EXPIRED |
| 413 | request over 64 KiB |
| 429 | OTP_COOLDOWN, RATE_LIMIT |
| 503 | OTP_DELIVERY_UNAVAILABLE |

Authenticated /videos*, paths containing /sync or /recording return 501. Camera,
commands, upload and library are outside Mốc 1 and do not return fake success.
