// lib/emoji/init.ts
import data from "@emoji-mart/data";
import { init } from "emoji-mart";

let initialized = false;
export function ensureEmojiInit() {
  if (!initialized) {
    init({ data });
    initialized = true;
  }
}
