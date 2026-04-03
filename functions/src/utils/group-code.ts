import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";

const groupCodeWords = [
  [
    "api", "app", "web", "bot", "job", "run", "dev", "ops", "git", "log",
    "key", "dbs", "sql", "net", "sys", "srv", "cli", "uix", "uxr", "kit",
    "lab", "doc", "tag", "map", "box", "hub", "zen", "fox", "oak", "sun",
    "sky", "sea", "ice", "red", "blu", "ash", "jet", "neo", "arc", "orb",
  ],
  [
    "home", "core", "base", "node", "edge", "mesh", "sync", "task", "flow", "pipe",
    "loop", "step", "gate", "auth", "user", "team", "role", "data", "file", "page",
    "view", "link", "host", "zone", "ring", "dock", "seed", "beam", "byte", "code",
    "test", "mock", "build", "ship", "plan", "road", "mark", "note", "ping", "scan",
    "grab", "send", "keep", "mint", "lava", "snow", "wolf", "hawk", "lion", "bear",
  ],
  [
    "admin", "proxy", "store", "cloud", "stack", "board", "alert", "scope", "draft", "audit",
    "cache", "queue", "token", "guard", "trace", "event", "model", "timer", "batch", "reset",
    "check", "merge", "craft", "spark", "forge", "flame", "river", "stone", "plant", "field",
    "point", "shift", "smart", "brave", "swift", "clear", "fresh", "prime", "solid",
  ],
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCode(): string {
  return `${pickRandom(groupCodeWords[0])}-${pickRandom(groupCodeWords[1])}-${pickRandom(groupCodeWords[2])}`;
}

export async function generateUniqueGroupCode(db: Firestore): Promise<string> {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    const snapshot = await db
      .collection("groups")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return code;
    }
  }
  throw new HttpsError("internal", "Unable to generate unique group code");
}
