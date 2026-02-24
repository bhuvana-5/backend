# backend
## Backend (Node.js)

### API Endpoints

### ✅ A. Chat Endpoint

`POST /api/chat`

**Request Body:**

```json
{
  "sessionId": "abc123",
  "message": "How can I reset my password?"
}
```

**Response:**

```json
{
  "reply": "Users can reset password from Settings > Security.",
  "tokensUsed": 123
}
```

### ✅ B. Fetch Conversation

`GET /api/conversations/:sessionId`

Returns all messages (user + assistant) for that session in chronological order.

### ✅ C. List Sessions

`GET /api/sessions`

Returns list of sessionIds with lastUpdated timestamp.
