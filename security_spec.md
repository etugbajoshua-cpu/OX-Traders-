# OX TRADERS Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
- **Identity Integrity**: Every user-owned document (`users/{uid}`, `wallets/{uid}`, `deposits`, `withdrawals`, `investments`, `kyc_records`, `notifications`, `support_tickets`) must bind `userId`/`uid == request.auth.uid` on creation and never reassign ownership.
- **PII Isolation**: User emails, phones, and KYC records are readable ONLY by the document owner (`request.auth.uid == userId`) or verified Admin (`veronikapistyur@gmail.com` or `/admins/{uid}`).
- **Financial Balance Conservation**: A non-admin investor may create `/wallets/{uid}` ONLY with strictly zero balances (`0`) and may NEVER increase `usdAvailable`, `btcAvailable + btcLocked`, or `usdtAvailable + usdtLocked`. Only admins can credit confirmed deposits or execute admin adjustments.
- **Terminal State Locking**: Once a `deposit` reaches `confirmed` or `rejected`, or a `withdrawal` reaches `completed` or `rejected`, non-admins cannot mutate it.
- **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps are enforced against `request.time`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated wallet read**: `GET /wallets/user_1` with `auth == null` -> DENIED.
2. **Self-assigned admin role on signup**: `CREATE /users/u1` with `{ role: 'admin', isVerified: true }` -> DENIED (`hasOnly` rejects `role` and `isVerified == true`).
3. **Self-credit wallet**: `UPDATE /wallets/u1` increasing `usdAvailable` from `0` to `50000` -> DENIED.
4. **Cross-user PII scrape**: `GET /users/victim_uid` as `attacker_uid` -> DENIED.
5. **Blanket user listing**: `LIST /users` as non-admin `attacker_uid` -> DENIED.
6. **Self-approved deposit**: `CREATE /deposits/d1` with `{ status: 'confirmed' }` -> DENIED.
7. **Mutate confirmed deposit**: `UPDATE /deposits/d1` after `status == 'confirmed'` as owner -> DENIED.
8. **Unverified email admin spoof**: `GET /admin_audit_logs` with `{ email: 'veronikapistyur@gmail.com', email_verified: false }` -> DENIED.
9. **Oversized ID injection**: `CREATE /deposits/${'x'.repeat(300)}` -> DENIED (`isValidId` max 128 chars).
10. **Self-verify KYC**: `UPDATE /kyc_records/u1` with `{ status: 'verified' }` as owner -> DENIED.
11. **Backdated timestamp**: `CREATE /withdrawals/w1` with `createdAt` in 2020 -> DENIED (`createdAt == request.time`).
12. **Orphan support message**: `CREATE /support_tickets/nonexistent/messages/m1` -> DENIED (`exists` parent check).
