[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

[@api-extraction-from-spec](../../tools/api-extraction-from-spec.md)

[@concept-definition](UserAuthentication.md)

[@concept-implementation](implementation.md)

# prompt: generate the API documentation for the UserAuthentication concept, use the implementation reference
# response:

# API Specification: UserAuthentication Concept

**Purpose:** enable users to register and verify their identity using a username and password.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**
- the username must not already exist in the system

**Effects:**
- create a new User with this username and password, returns the user

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user using their username and password.

**Requirements:**
- there exists a user with the given username and password

**Effects:**
- returns the registered user that matches with the given username and password

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/UserAuthentication/_getUsername

**Description:** Retrieves the username associated with a given user ID.

**Requirements:**
- user exists

**Effects:**
- returns the username associated with the user

**Request Body:**
```json
{
  "user": "User"
}
```

**Success Response Body (Query):**
```json
[
  {
    "username": "String"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/UserAuthentication/_getUserByUsername

**Description:** Retrieves a user ID by their username.

**Requirements:**
- a user with the given username exists

**Effects:**
- if a user with the given username exists, returns that user; otherwise returns an error

**Request Body:**
```json
{
  "username": "String"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "User"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---