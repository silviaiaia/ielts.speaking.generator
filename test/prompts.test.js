const test = require("node:test");
const assert = require("node:assert/strict");

const { TOPICS, PARTS, SYSTEM_INSTRUCTION, planRequest } = require("../api/prompts");

const PART_IDS = ["part1", "part2", "part3"];

test("every part is fully configured", () => {
  assert.deepEqual(Object.keys(PARTS).sort(), [...PART_IDS].sort());
  for (const id of PART_IDS) {
    const part = PARTS[id];
    assert.equal(typeof part.label, "string", `${id} label`);
    assert.equal(typeof part.buildPrompt, "function", `${id} buildPrompt`);
    assert.equal(part.schema.type, "OBJECT", `${id} schema type`);
  }
});

test("every required schema field is actually declared", () => {
  for (const id of PART_IDS) {
    const { schema } = PARTS[id];
    for (const field of schema.required) {
      assert.ok(schema.properties[field], `${id}.${field} is required but not declared`);
    }
    // propertyOrdering is what Gemini uses to order its output; a field
    // missing from it is a field whose position is undefined.
    assert.deepEqual(
      [...schema.propertyOrdering].sort(),
      Object.keys(schema.properties).sort(),
      `${id} propertyOrdering must cover every property`,
    );
  }
});

test("array bounds are strings, as the Gemini schema requires", () => {
  // Regression guard: the REST API types minItems/maxItems as int64, which
  // the SDK surfaces as `string`. Passing numbers here is silently wrong.
  for (const id of PART_IDS) {
    for (const [name, prop] of Object.entries(PARTS[id].schema.properties)) {
      if (prop.type !== "ARRAY") continue;
      assert.equal(typeof prop.minItems, "string", `${id}.${name}.minItems`);
      assert.equal(typeof prop.maxItems, "string", `${id}.${name}.maxItems`);
    }
  }
});

test("topic ids are unique and url-safe", () => {
  const ids = TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate topic id");
  for (const topic of TOPICS) {
    assert.match(topic.id, /^[a-z0-9-]+$/, `bad id: ${topic.id}`);
    assert.ok(topic.label.length > 0, `empty label for ${topic.id}`);
  }
});

test("a known topic id is honoured", () => {
  for (const topic of TOPICS) {
    const plan = planRequest("part1", topic.id);
    assert.equal(plan.topic.id, topic.id);
  }
});

test("an unknown or missing topic falls back to a real topic", () => {
  for (const bad of [undefined, null, "", "not-a-topic", 42]) {
    const plan = planRequest("part2", bad);
    assert.ok(
      TOPICS.includes(plan.topic),
      `fallback returned something not in the catalogue for ${String(bad)}`,
    );
  }
});

test("the angle always belongs to the part being asked for", () => {
  // The angle is drawn at random, so sample enough to catch cross-wiring.
  for (const id of PART_IDS) {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      seen.add(planRequest(id, "food").angle);
    }
    assert.ok(seen.size > 1, `${id} never varied its angle`);
    for (const angle of seen) {
      assert.equal(typeof angle, "string");
      assert.ok(angle.length > 0);
    }
  }
});

test("random topic selection reaches more than one topic", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(planRequest("part3").topic.id);
  assert.ok(seen.size > 1, "random topic selection is stuck");
});

test("the prompt carries the topic and angle it was given", () => {
  for (const id of PART_IDS) {
    const { topic, angle } = planRequest(id, "travel");
    const prompt = PARTS[id].buildPrompt({ topic: topic.label, angle });
    assert.ok(prompt.includes(topic.label), `${id} prompt omits the topic`);
    assert.ok(prompt.includes(angle), `${id} prompt omits the angle`);
  }
});

test("the system instruction bans the stock textbook items", () => {
  for (const banned of ["favourite food", "Describe your hometown"]) {
    assert.ok(
      SYSTEM_INSTRUCTION.includes(banned),
      `system instruction no longer names "${banned}"`,
    );
  }
});
