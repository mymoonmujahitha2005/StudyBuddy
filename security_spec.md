# Security Specification - MoonBuddy AI

## Data Invariants
1. **User Profile**: A user can only manage their own profile. Creation requires matching the auth UID. Only specific fields like `displayName`, `photoURL`, and `lastLogin` are mutable.
2. **Study Material**: 
   - Must belong to a valid authenticated user.
   - `userId` must match `request.auth.uid` on creation and remain immutable.
   - `status` must be one of `processing`, `completed`, or `failed`.
   - `createdAt` must be set to the server timestamp on creation and remain immutable.
   - Access (read/update/delete) is restricted to the owner (`userId`).

## The "Dirty Dozen" Payloads (Denial Tests)

### 1. Identity Spoofing (Create Material as someone else)
```json
{
  "userId": "victim_uid",
  "fileName": "hack.pdf",
  "fileType": "pdf",
  "status": "completed",
  "createdAt": "server_timestamp",
  "title": "Hacked"
}
```
*Target*: `/materials/{id}`
*Result*: PERMISSION_DENIED (UID mismatch)

### 2. Identity Spoofing (Update Material owner)
```json
{
  "userId": "attacker_uid_changed_to_someone_else"
}
```
*Target*: `/materials/{id}` (update)
*Result*: PERMISSION_DENIED (userId immutable)

### 3. Resource Poisoning (Massive ID)
*Action*: Create document with 2KB ID string.
*Result*: PERMISSION_DENIED (`isValidId` check)

### 4. Shadow Field Injection (Add extra data)
```json
{
  "userId": "auth_uid",
  "fileName": "test.pdf",
  "fileType": "pdf",
  "status": "completed",
  "createdAt": "server_timestamp",
  "adminVerified": true
}
```
*Result*: PERMISSION_DENIED (Strict key check)

### 5. State Shortcut (Invalid status)
```json
{
  "status": "approved_by_hacker"
}
```
*Result*: PERMISSION_DENIED (Status enum check)

### 6. Temporal Hijack (Client-side createdAt)
```json
{
  "createdAt": "2000-01-01T00:00:00Z"
}
```
*Result*: PERMISSION_DENIED (serverTimestamp check)

### 7. PII Leak (Read other user profile)
*Action*: `get /users/victim_uid` as `attacker_uid`
*Result*: PERMISSION_DENIED (isOwner check)

### 8. Unauthenticated Write
*Action*: `create /materials/123` with no auth.
*Result*: PERMISSION_DENIED (`isSignedIn` check)

### 9. Delete someone else's material
*Action*: `delete /materials/victim_material_id` as `attacker_uid`
*Result*: PERMISSION_DENIED (isOwner check)

### 10. List all materials (Scraping)
*Action*: `list /materials`
*Result*: PERMISSION_DENIED (Rule must enforce `resource.data.userId == request.auth.uid`)

### 11. Self-Assign Admin
```json
{
  "role": "admin"
}
```
*Target*: `/users/{auth_uid}` (update)
*Result*: PERMISSION_DENIED (role not in affectedKeys)

### 12. Invalid Type Injection
```json
{
  "flashcards": "not_an_array"
}
```
*Result*: PERMISSION_DENIED (Type safety check)
