import fs from "node:fs/promises";
import path from "node:path";

import type {
  Newsletter,
} from "../agent/state.js";

function escapeHtml(
  value: string
): string {

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownToBasicHtml(
  markdown: string
): string {

  let html =
    escapeHtml(markdown);

  html = html.replace(
    /^### (.*)$/gm,
    "<h3>$1</h3>"
  );

  html = html.replace(
    /^## (.*)$/gm,
    "<h2>$1</h2>"
  );

  html = html.replace(
    /^# (.*)$/gm,
    "<h1>$1</h1>"
  );

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  html = html.replace(
    /\n\n/g,
    "</p><p>"
  );

  return `<p>${html}</p>`;
}

export async function generateNewsletterFiles(
  newsletter: Newsletter
) {

  const outputDirectory =
    path.resolve(
      process.cwd(),
      "output"
    );

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    }
  );

  const timestamp =
    Date.now();

  const markdownPath =
    path.join(
      outputDirectory,
      `newsletter-${timestamp}.md`
    );

  const htmlPath =
    path.join(
      outputDirectory,
      `newsletter-${timestamp}.html`
    );

  const htmlBody =
    markdownToBasicHtml(
      newsletter.markdown
    );

  const html = `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
${escapeHtml(newsletter.subject)}
</title>

<style>

body {
  margin: 0;
  padding: 40px 20px;
  background: #f5f7fb;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
  color: #1f2937;
}

.container {
  max-width: 760px;
  margin: auto;
  background: white;
  padding: 40px;
  border-radius: 16px;
}

h1 {
  font-size: 32px;
}

h2 {
  margin-top: 35px;
}

p {
  line-height: 1.7;
}

a {
  color: #2563eb;
}

.footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
  color: #777;
}

</style>

</head>

<body>

<div class="container">

${htmlBody}

<div class="footer">
AI Agents Weekly
</div>

</div>

</body>

</html>
`;

  await fs.writeFile(
    markdownPath,
    newsletter.markdown,
    "utf8"
  );

  await fs.writeFile(
    htmlPath,
    html,
    "utf8"
  );

  return {
    markdownPath,
    htmlPath,
  };
}


export async function simulateEmailSend(
  newsletter: Newsletter
) {

  const recipients = [
    "subscriber1@example.com",
    "subscriber2@example.com",
    "subscriber3@example.com",
  ];

  console.log("\n");
  console.log(
    "=========================================="
  );

  console.log(
    "SIMULATED EMAIL DELIVERY"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "To:",
    recipients.join(", ")
  );

  console.log(
    "Subject:",
    newsletter.subject
  );

  console.log(
    "Recipients:",
    recipients.length
  );

  console.log(
    "Status: SUCCESS"
  );

  console.log(
    "=========================================="
  );

  return {
    status: "success",
    provider: "MockEmailService",
    recipientCount:
      recipients.length,
    subject:
      newsletter.subject,
  };
}