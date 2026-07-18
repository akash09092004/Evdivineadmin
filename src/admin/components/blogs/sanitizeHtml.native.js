export default function sanitizeBlogHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z-]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z-]+\s*=\s*'[^']*'/gi, "");
}

