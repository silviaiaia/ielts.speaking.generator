const express = require("express");
const cors = require("cors");
const { GoogleGenAI, ThinkingLevel } = require("@google/genai");
require("dotenv").config();

const { TOPICS, PARTS, SYSTEM_INSTRUCTION, planRequest } = require("./prompts");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Instantiated once per serverless container rather than per request, so a
// warm invocation reuses the client.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gemini's flash models return 503 UNAVAILABLE under load often enough that a
 * single attempt fails several times an hour, and those clear in well under a
 * second — so retry them with a short backoff.
 *
 * 429 is deliberately NOT retried. The free tier allows 5 requests/minute and
 * the quota error asks for a ~20s wait, which is longer than the serverless
 * function's own timeout; retrying inside the request would time out anyway
 * and burn another unit of quota on the way. Surface it to the caller instead.
 *
 * The attempt count is capped at 3 for the same reason: every retry is itself
 * a metered request, so a run of 503s would otherwise spend most of a minute's
 * free-tier quota and turn a recoverable outage into a 429 for the next user.
 */
const TRANSIENT_STATUSES = [500, 502, 503, 504];

async function generateWithRetry(request, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      if (attempt >= attempts || !TRANSIENT_STATUSES.includes(error.status)) {
        throw error;
      }
      console.warn(`Gemini returned ${error.status}; retry ${attempt}`);
      await sleep(500 * 2 ** (attempt - 1));
    }
  }
}

/**
 * The daily free-tier allowance is shared by everyone who loads the site, so
 * a wide-open `origin: "*"` let any other page spend it from their visitors'
 * browsers. Restrict it to this project's own deployments — production, the
 * per-commit preview URLs, and localhost.
 *
 * This is not a security boundary: CORS is enforced by browsers, so curl is
 * unaffected. Real abuse protection would need a shared rate-limit store,
 * which a single serverless function cannot provide on its own.
 */
const ALLOWED_ORIGIN =
  /^https:\/\/ielts-speaking-generator[a-z0-9-]*\.vercel\.app$/;
const LOCAL_ORIGIN = /^http:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header at all: curl, or a same-origin navigation.
      if (!origin) return callback(null, true);
      callback(null, ALLOWED_ORIGIN.test(origin) || LOCAL_ORIGIN.test(origin));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", model: MODEL });
});

// The front end builds its topic picker from this, so the catalogue lives in
// exactly one place.
app.get("/api/topics", (req, res) => {
  res.status(200).json({ topics: TOPICS });
});

app.post("/api/generate_question", async (req, res) => {
  const { part, topic: topicId } = req.body || {};

  const config = PARTS[part];
  if (!config) {
    return res
      .status(400)
      .json({ error: "Unknown part. Expected part1, part2 or part3." });
  }

  const { topic, angle } = planRequest(part, topicId);

  try {
    const result = await generateWithRetry({
      model: MODEL,
      contents: config.buildPrompt({ topic: topic.label, angle }),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // High temperature widens the pool of phrasings; the topic and angle
        // injected above are what keep the output on task despite it.
        temperature: 1.0,
        // Writing four exam questions to a fixed schema is not a reasoning
        // task, and on a thinking model the thought tokens are billed against
        // maxOutputTokens — left on the default they truncated the JSON
        // mid-string. Low thinking plus headroom keeps responses complete.
        thinkingLevel: ThinkingLevel.LOW,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: config.schema,
      },
    });

    let payload;
    try {
      payload = JSON.parse(result.text);
    } catch (parseError) {
      const finishReason = result.candidates?.[0]?.finishReason;
      console.error(
        `Model returned invalid JSON (finishReason=${finishReason}):`,
        result.text,
      );
      return res
        .status(502)
        .json({ error: "The model returned malformed output. Please try again." });
    }

    res.status(200).json({
      part,
      partLabel: config.label,
      topic: topic.label,
      topicId: topic.id,
      ...payload,
    });
  } catch (error) {
    // Gemini's own error text carries quota figures and internal URLs, so it
    // goes to the log; the caller gets something it can act on.
    console.error("Question generation failed:", error);

    if (error.status === 429) {
      // The free tier meters both per minute and per day, and the two need
      // very different advice — "try again in 30 seconds" is actively
      // misleading once the daily allowance is gone.
      const dailyQuota = /PerDay/i.test(error.message || "");
      return res.status(429).json({
        error: dailyQuota
          ? "Today's free allowance is used up. It resets tomorrow."
          : "Too many requests right now. Try again in about 30 seconds.",
      });
    }

    res
      .status(502)
      .json({ error: "Could not generate questions. Please try again." });
  }
});

// In production Vercel serves the two static files straight from the repo
// root (see vercel.json) and never reaches this function for them. Locally
// there is no such layer, so `npm run dev` serves them here — named
// explicitly rather than via express.static, so nothing else in the repo
// root (.env included) can be requested.
if (process.env.NODE_ENV !== "production") {
  const path = require("path");
  const root = path.join(__dirname, "..");
  app.get("/", (req, res) => res.sendFile(path.join(root, "index.html")));
  app.get("/script.js", (req, res) =>
    res.sendFile(path.join(root, "script.js")),
  );
}

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "No such API endpoint", path: req.path });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
