export function normalizeSubject(subject = "") {
  return subject
    .replace(/^(re|fwd):\s*/gi, "")
    .trim()
    .toLowerCase();
}