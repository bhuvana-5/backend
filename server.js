require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const docs = require("./docs.json");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "sessionId and message required"
      });
    }

    db.run(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`, [sessionId]);

    db.run(
      `INSERT INTO messages (session_id, role, content)
       VALUES (?, ?, ?)`,
      [sessionId, "user", message]
    );

    db.all(
      `SELECT role, content FROM messages
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [sessionId],
      async (err, rows) => {
        if (err) return res.status(500).json({ error: "DB error" });

        const history = rows.reverse();

        const docsContent = docs
          .map(d => `${d.title}: ${d.content}`)
          .join("\n");

        const prompt = `
You are a support assistant.

You MUST answer ONLY using the documentation below.

If answer not found, respond EXACTLY:
"Sorry, I don’t have information about that."

Documentation:
${docsContent}

Conversation History:
${history.map(h => `${h.role}: ${h.content}`).join("\n")}

User Question:
${message}
`;

        const completion =
          await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
          });

        const reply =
          completion.choices[0].message.content;

        db.run(
          `INSERT INTO messages (session_id, role, content)
           VALUES (?, ?, ?)`,
          [sessionId, "assistant", reply]
        );

        res.json({
          reply,
          tokensUsed: completion.usage.total_tokens
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "LLM failure" });
  }
});

app.get("/api/conversations/:sessionId", (req, res) => {
  db.all(
    `SELECT role, content, created_at
     FROM messages
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [req.params.sessionId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json(rows);
    }
  );
});

app.get("/api/sessions", (req, res) => {
  db.all(
    `SELECT id, updated_at FROM sessions
     ORDER BY updated_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json(rows);
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
