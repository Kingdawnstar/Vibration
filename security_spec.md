# Security Specification & "Dirty Dozen" Threat Vectors

This security specification profiles application-level invariants and the 12 precise attack payloads designed to violate system safety, verifying that our Firestore security rules prevent compromise.

## 1. Data Invariants
*   **Post Authorship & Controls**: Admins alone can write to `/posts/{postId}`. Users can only read posts.
*   **User Identity Lock**: A user can only register or update a document in `/users/{userId}` where `userId` matches `request.auth.uid`. No user can mark themselves as an `admin` or change their level of access.
*   **Unique Likes**: Users like posts by writing a document matching `/likes/{userId_postId}` where `userId` is `request.auth.uid`. This forms a unique composite id, preventing duplicate likes.
*   **Comments Ownership**: A user can only write or delete comments if their logged-in credentials match the stored comment `userId`.

---

## 2. The "Dirty Dozen" Payloads (Red Team Attack Specs)

| Attack ID | Resource Target | Payload Attempt | Security Gate Rule | Expected Result |
|-----------|-----------------|-----------------|-------------------|-----------------|
| **SD-01** | `/users/otherUser` | Spoofed Profile Update: `{ "name": "Hack", "role": "admin" }` with `request.auth.uid = "user123"` | Identity Integrity Checked | `PERMISSION_DENIED` |
| **SD-02** | `/users/user123` | Self-Elevation Attack: Change `role` to `'admin'` | Immutability on Privilege Fields | `PERMISSION_DENIED` |
| **SD-03** | `/posts/post456` | Unauthenticated Post Edit: Try to update metadata | Admin-Only Write Check | `PERMISSION_DENIED` |
| **SD-04** | `/posts/junk` | Post injection by standard user | Admin-Only Write Check | `PERMISSION_DENIED` |
| **SD-05** | `/comments/c1` | Create comment with spoofed `userId: "adminUID"` | auth.uid matching input model | `PERMISSION_DENIED` |
| **SD-06** | `/comments/c1` | Update another student's comment | Comment owner verification | `PERMISSION_DENIED` |
| **SD-07** | `/likes/userA_post1` | Write a double-vote or create a like on behalf of userB | Composite owner validation | `PERMISSION_DENIED` |
| **SD-08** | `/comments/c2` | Comment text with sizing bypass (e.g. 1MB of text) | Size boundaries: max size is 1000 characters | `PERMISSION_DENIED` |
| **SD-09** | `/posts/postXYZ` | Post ID path pollution using characters `post#$%&!` | ID format regex guard (`isValidId`) | `PERMISSION_DENIED` |
| **SD-10** | `/users/user123` | Spoof email verification token check | Ensure `email_verified == true` is required | `PERMISSION_DENIED` |
| **SD-11** | `/notifications/all` | General User writing notification bulletins to everyone | Admin verification for mass dispatch | `PERMISSION_DENIED` |
| **SD-12** | `/comments/c1` | System Field injection (introducing extra fields like `likes` inside comments) | Exact map size check to prevent shadow keys | `PERMISSION_DENIED` |

---

## 3. The Rules Test Runner Layout

A clean integration test suite is mapped to run rules simulations using the Firebase Emulator / `@firebase/rules-unit-testing` framework. All 12 test payloads are modeled to be denied synchronously upon rules execution.
