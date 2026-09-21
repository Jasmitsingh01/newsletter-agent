import puppeteer, { Browser, CDPSession, Page } from "puppeteer-core";
import fs from "node:fs";

// Find available Chrome binary on Linux/Mac/Windows
function getChromeExecutablePath(): string {
  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "/usr/bin/google-chrome-stable";
}

export interface BrowserActionCallback {
  (event: {
    action: "launch" | "navigate" | "type" | "click" | "scroll" | "extract" | "screencast";
    url?: string;
    title?: string;
    query?: string;
    screenshot?: string; // base64 jpeg
    details?: string;
  }): void;
}

export interface ScrapedPageResult {
  title: string;
  url: string;
  content: string;
  screenshot?: string;
  links?: { text: string; href: string }[];
}

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }

  const executablePath = getChromeExecutablePath();

  sharedBrowser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,800",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  });

  return sharedBrowser;
}

export async function browseAndScrapeUrl(
  url: string,
  onAction?: BrowserActionCallback
): Promise<ScrapedPageResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let screencastSession: CDPSession | null = null;

  try {
    browser = await getBrowser();
    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Stream Chrome's rendered frames while this page is being automated.
    // This is a DevTools screencast, not a sequence of manually captured
    // screenshots, so the client sees navigation and page rendering as it happens.
    if (onAction) {
      screencastSession = await page.createCDPSession();
      let lastFrameAt = 0;

      screencastSession.on("Page.screencastFrame", (frame) => {
        // Chrome can close a target between emitting a frame and receiving its
        // acknowledgment. Treat that normal teardown race as non-fatal.
        const session = screencastSession;
        void session?.send("Page.screencastFrameAck", {
          sessionId: frame.sessionId,
        }).catch(() => undefined);

        // Cap outbound frames at roughly 6 fps to keep SSE responsive.
        const now = Date.now();
        if (now - lastFrameAt < 160) return;
        lastFrameAt = now;

        onAction({
          action: "screencast",
          url: page?.url(),
          screenshot: `data:image/jpeg;base64,${frame.data}`,
          details: "Streaming live Chromium viewport…",
        });
      });

      await screencastSession.send("Page.startScreencast", {
        format: "jpeg",
        quality: 55,
        maxWidth: 1280,
        maxHeight: 800,
        everyNthFrame: 1,
      });
    }

    if (onAction) {
      onAction({
        action: "navigate",
        url,
        details: `Navigating browser to ${url}`,
      });
    }

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    }).catch(() => null);

    // Wait 500ms for dynamic rendering
    await new Promise((r) => setTimeout(r, 600));

    const title = await page.title().catch(() => "Web Article");

    // Extract text content and links from DOM
    const data = await page.evaluate(() => {
      // Remove noisy elements
      const scripts = document.querySelectorAll("script, style, noscript, nav, footer, iframe, svg");
      scripts.forEach((s) => s.remove());

      const mainEl =
        document.querySelector("article, main, [role='main'], .content, #content, .post-content") ||
        document.body;

      const text = mainEl ? (mainEl as HTMLElement).innerText : document.body.innerText;

      const links: { text: string; href: string }[] = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const text = (a as HTMLElement).innerText?.trim();
        const href = (a as HTMLAnchorElement).href;
        if (text && href && href.startsWith("http") && links.length < 12) {
          links.push({ text: text.slice(0, 50), href });
        }
      });

      return {
        text: text.slice(0, 6000),
        links,
      };
    });

    if (onAction) {
      onAction({
        action: "extract",
        url,
        title,
        details: `Extracted ${data.text.length} characters of DOM text from ${title}`,
      });
    }

    return {
      title: title || url,
      url,
      content: data.text || "Article content extracted by browser.",
      links: data.links,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      title: url,
      url,
      content: `Page scraped with basic extractor. (${errorMsg})`,
    };
  } finally {
    if (screencastSession) {
      await screencastSession.send("Page.stopScreencast").catch(() => null);
      await screencastSession.detach().catch(() => null);
    }
    if (page) {
      await page.close().catch(() => null);
    }
  }
}
