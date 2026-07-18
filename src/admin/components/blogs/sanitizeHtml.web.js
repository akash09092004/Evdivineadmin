import DOMPurify from "dompurify";

export default function sanitizeBlogHtml(html) {
  return DOMPurify.sanitize(String(html || ""), {
    USE_PROFILES: { html: true },
  });
}

