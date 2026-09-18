const { Type } = require("@google/genai");

/**
 * Topic catalogue.
 *
 * Asked for a question with no further steering, a model collapses onto the
 * same handful of textbook topics every time — hometown, favourite food,
 * hobbies. Seeding each request with an explicit topic (and, below, an angle)
 * is what keeps successive generations from repeating themselves.
 */
const TOPICS = [
  { id: "hometown", label: "Hometown & neighbourhood" },
  { id: "work-study", label: "Work & study" },
  { id: "daily-routine", label: "Daily routine & time" },
  { id: "food", label: "Food & cooking" },
  { id: "travel", label: "Travel & holidays" },
  { id: "technology", label: "Technology & the internet" },
  { id: "environment", label: "Environment & climate" },
  { id: "education", label: "Education & learning" },
  { id: "health", label: "Health & fitness" },
  { id: "music", label: "Music & entertainment" },
  { id: "books", label: "Books & reading" },
  { id: "sport", label: "Sport & outdoor activities" },
  { id: "shopping", label: "Shopping & spending" },
  { id: "family", label: "Family & friends" },
  { id: "art", label: "Art & creativity" },
  { id: "cities", label: "Cities & transport" },
  { id: "money", label: "Money & personal finance" },
  { id: "weather", label: "Weather & seasons" },
  { id: "animals", label: "Animals & nature" },
  { id: "media", label: "Media & news" },
  { id: "traditions", label: "Celebrations & traditions" },
  { id: "clothes", label: "Clothes & fashion" },
  { id: "housing", label: "Housing & living spaces" },
  { id: "social-media", label: "Social media & communication" },
  { id: "childhood", label: "Childhood memories" },
  { id: "future", label: "Goals & the future" },
  { id: "languages", label: "Languages & culture" },
  { id: "work-life", label: "Work-life balance" },
];

/**
 * Second variety axis. A topic alone still leaves the model free to reach for
 * the most obvious question in that topic, so each request also fixes the
 * angle it has to come at the topic from. 28 topics x ~6 angles gives roughly
 * 170 distinct starting points per part.
 */
const ANGLES = {
  part1: [
    "the candidate's own habits and preferences",
    "how often they do it, and when",
    "a past experience of it",
    "what they like and dislike about it, and why",
    "how it has changed for them over the last few years",
    "a comparison between two options within the topic",
  ],
  part2: [
    "a person",
    "a place",
    "an object they own or want",
    "an event or experience",
    "an activity or habit",
    "something they read, watched or listened to",
    "a plan or goal",
  ],
  part3: [
    "its effect on society as a whole",
    "how younger and older generations differ on it",
    "what schools, employers or governments should do about it",
    "its advantages weighed against its drawbacks",
    "how it is likely to change in the next twenty years",
    "how it differs between countries or between cities and the countryside",
  ],
};

const SYSTEM_INSTRUCTION = `You are a senior item writer for the IELTS Speaking test, with fifteen years of experience authoring and examining Cambridge-style speaking tasks.

Every question you write must:
- Sound like natural spoken English that an examiner would say out loud, not like written prose.
- Be understandable to a Band 5 candidate while still leaving a Band 8 candidate room to show range.
- Be answerable by any adult anywhere in the world. Never assume a candidate's country, income, religion, job, family situation, or access to travel.
- Never require specialist knowledge, statistics, named studies, or current affairs.
- Avoid a bare yes/no shape unless the question immediately opens the answer up ("Do you...? Why?").
- Avoid the stock textbook items entirely: "What is your favourite food?", "Describe your hometown", "Do you like music?", "Tell me about your family". Take a specific, concrete angle instead.

Return only the JSON object described by the schema.`;

const TOPIC_LABEL_FIELD = {
  type: Type.STRING,
  description:
    "A 2-4 word title for this specific set, more specific than the topic area itself. Title Case, no final punctuation.",
};

const PARTS = {
  part1: {
    label: "Part 1",
    schema: {
      type: Type.OBJECT,
      properties: {
        topicLabel: TOPIC_LABEL_FIELD,
        questions: {
          type: Type.ARRAY,
          description: "Exactly 4 questions, in the order the examiner asks them.",
          minItems: "4",
          maxItems: "4",
          items: { type: Type.STRING },
        },
      },
      required: ["topicLabel", "questions"],
      propertyOrdering: ["topicLabel", "questions"],
    },
    buildPrompt: ({ topic, angle }) => `Write one IELTS Speaking Part 1 topic set.

Topic area: ${topic}
Angle to explore: ${angle}

Requirements:
- Exactly 4 questions, ordered as an examiner would ask them: start with the most concrete and progress to the one that invites the longest answer.
- Part 1 is a warm-up, not a discussion. Each question must be answerable in 20-40 seconds.
- One sentence each, 20 words maximum. No multi-part questions.
- Use the second person and the present tense ("Do you...", "How often...", "What kind of...").
- All four must stay inside the topic area without paraphrasing one another.`,
  },

  part2: {
    label: "Part 2",
    schema: {
      type: Type.OBJECT,
      properties: {
        topicLabel: TOPIC_LABEL_FIELD,
        task: {
          type: Type.STRING,
          description:
            'The opening line of the cue card. Always begins with "Describe ". One sentence, 8-18 words.',
        },
        bullets: {
          type: Type.ARRAY,
          description:
            'Exactly 3 prompts in the official style ("what it was", "who you were with"). 3-8 words each, lowercase, no final punctuation.',
          minItems: "3",
          maxItems: "3",
          items: { type: Type.STRING },
        },
        explainPrompt: {
          type: Type.STRING,
          description:
            'The closing line. Always begins with "and explain ". Asks for a reason, feeling or significance, never another fact.',
        },
        followUps: {
          type: Type.ARRAY,
          description:
            "Exactly 2 short rounding-off questions asked straight after the two-minute turn.",
          minItems: "2",
          maxItems: "2",
          items: { type: Type.STRING },
        },
      },
      required: ["topicLabel", "task", "bullets", "explainPrompt", "followUps"],
      propertyOrdering: [
        "topicLabel",
        "task",
        "bullets",
        "explainPrompt",
        "followUps",
      ],
    },
    buildPrompt: ({ topic, angle }) => `Write one IELTS Speaking Part 2 cue card.

Topic area: ${topic}
Card type: the candidate must describe ${angle}

Requirements:
- The card must give an average candidate enough to talk about for a full two minutes without inventing statistics or needing expert knowledge.
- The three bullets must each open a different line of talk. Do not let one bullet answer another.
- The closing "and explain ..." line must ask for a reason, a feeling or why it mattered, not for one more fact.
- The two follow-ups are quick rounding-off questions about the candidate's own answer, not abstract Part 3 discussion.`,
  },

  part3: {
    label: "Part 3",
    schema: {
      type: Type.OBJECT,
      properties: {
        topicLabel: TOPIC_LABEL_FIELD,
        questions: {
          type: Type.ARRAY,
          description:
            "Exactly 4 discussion questions, ordered from concrete to abstract.",
          minItems: "4",
          maxItems: "4",
          items: { type: Type.STRING },
        },
      },
      required: ["topicLabel", "questions"],
      propertyOrdering: ["topicLabel", "questions"],
    },
    buildPrompt: ({ topic, angle }) => `Write one IELTS Speaking Part 3 discussion set.

Topic area: ${topic}
Discussion angle: ${angle}

Requirements:
- Exactly 4 questions that climb from concrete to abstract: the first answerable from everyday observation, the last requiring speculation, evaluation or comparison.
- Part 3 is about people and society in general, not the candidate's own life. Use shapes like "Why do you think...", "What effect has...", "Do you think ... will...", "How do ... differ from...".
- Each must invite a 40-60 second answer supported by reasons and examples.
- One sentence each, 25 words maximum.`,
  },
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Resolve the topic and angle for one request. An unknown or absent topicId
 * means "surprise me" and draws at random; the angle is always random, so even
 * a user who keeps picking the same topic keeps getting new questions.
 */
function planRequest(part, topicId) {
  const topic = TOPICS.find((t) => t.id === topicId) || pick(TOPICS);
  return { topic, angle: pick(ANGLES[part]) };
}

module.exports = { TOPICS, PARTS, SYSTEM_INSTRUCTION, planRequest };
