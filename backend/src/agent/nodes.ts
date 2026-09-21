
import {
  HumanMessage,
} from "@langchain/core/messages";

import { z } from "zod";

import {
  NewsletterStateType,
  Article,
  ArticleSummary,
} from "./state.js";

import { searchWeb } from "../tools/webSearch.js";

import { config } from "../config.js";

import {
  generateNewsletterFiles,
} from "../tools/emailSimulator.js";
import { browseAndScrapeUrl } from "../tools/browserUse.js";
import { emitBrowserUseEvent } from "../services/newsletterAgent.js";
import { ChatOllama } from "@langchain/ollama";


const llm = new ChatOllama({
  model: "gemma4:31b",
  temperature: 0.2,
  baseUrl: "https://ollama.com",
   headers: {
    Authorization: `Bearer ${config.ollamaApiKey}`,
  },
});


export async function researchNode(
  state: NewsletterStateType
) {

  const allResults: Article[] = [
    ...(state.articles || [])
  ];

  const queries = [...state.searchQueries];
  if (state.userReferences && state.userReferences.length > 0) {
    for (const ref of state.userReferences) {
      if (ref && ref.trim() && !queries.includes(ref.trim())) {
        queries.push(ref.trim());
      }
    }
  }

  const logs: string[] = [];

  for (const query of queries) {
    logs.push(`[BROWSER:SEARCH] query: "${query}"`);
    emitBrowserUseEvent({
      action: "type",
      query,
      details: `Browser-Use: Typing query "${query}" into search engine...`,
    });

    const results = await searchWeb(query);
    logs.push(`[BROWSER:RESULTS] Found ${results.length} web pages for "${query}"`);

    // Browse and capture screenshots for top search results using real Chrome
    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const result = results[i];

      logs.push(`[BROWSER:NAVIGATE] url: "${result.url}" title: "${result.title.slice(0, 70)}"`);

      // Real browser navigation & screenshot capture
      const scraped = await browseAndScrapeUrl(result.url, (event) => {
        emitBrowserUseEvent(event);
      });

      logs.push(`[BROWSER:READING] reading text from "${scraped.title.slice(0, 50)}"...`);

      allResults.push({
        title: scraped.title || result.title,
        url: result.url,
        content: scraped.content || result.content,
        publishedDate: result.published_date,
        score: result.score,
        screenshot: scraped.screenshot,
        links: scraped.links,
      });
    }

    // Add remaining results with standard snippet content
    for (let i = 3; i < results.length; i++) {
      const result = results[i];
      allResults.push({
        title: result.title,
        url: result.url,
        content: result.content,
        publishedDate: result.published_date,
        score: result.score,
      });
    }
  }

  // Remove duplicate URLs
  const unique = new Map<
    string,
    Article
  >();

  for (const article of allResults) {
    if (!unique.has(article.url)) {
      unique.set(
        article.url,
        article
      );
    }
  }

  const articles =
    Array.from(unique.values());

  logs.push(`Web research completed: ${articles.length} unique articles available for ranking`);

  return {
    articles,

    logs,
  };
}

const PlanSchema = z.object({
  topic: z.string(),

  audience: z.string(),

  frequency: z.string(),

  articleCount: z.number(),

  searchQueries: z.array(z.string()),

  newsletterStyle: z.string(),
});

export async function plannerNode(
  state: NewsletterStateType
) {
  const planner = llm.withStructuredOutput(
    PlanSchema,
    {
      method: "jsonMode"
    }
  );

  const response = await planner.invoke([
    new HumanMessage(`
You are the planning component of an autonomous
AI newsletter agent.

User goal:

${state.goal}
${state.userFeedback ? `
HUMAN FEEDBACK / REFINEMENT REQUEST:
"${state.userFeedback}"
Please tailor the search queries, topic focus, and audience to address this user request specifically.
` : ""}${state.userReferences && state.userReferences.length > 0 ? `
USER PROVIDED REFERENCES / SEARCH SEEDS:
${state.userReferences.join("\n")}
` : ""}
Create an execution plan.

The newsletter should focus on recent AI agent
developments.

Requirements:

- Find recent information
- Select 5-7 high-quality stories
- Avoid duplicate stories
- Prefer primary sources
- Produce a professional newsletter
- Include source links
- The final newsletter should be suitable
  for subscribers

Respond with ONLY a valid JSON object (no markdown,
no code fences) with exactly these keys:
{
  "topic": string,
  "audience": string,
  "frequency": string,
  "articleCount": number,
  "searchQueries": string[],
  "newsletterStyle": string
}
`)
  ]);

  return {
    plan: response,

    searchQueries:
      response.searchQueries,

    logs: [
      `Planner created ${response.searchQueries.length} research queries`
    ],
  };
}


const RankedArticlesSchema = z.object({
  selected: z.array(
    z.object({
      url: z.string(),
      reason: z.string(),
    })
  ),
});

export async function rankArticlesNode(
  state: NewsletterStateType
) {

  const articleText =
    state.articles
      .map(
        (article, index) => `
ARTICLE ${index + 1}

Title:
${article.title}

URL:
${article.url}

Content:
${article.content.slice(0, 3000)}
`
      )
      .join("\n\n");

  const ranker =
    llm.withStructuredOutput(
      RankedArticlesSchema,
      {
        method: "jsonMode"
      }
    );

  const response = await ranker.invoke([
    new HumanMessage(`
You are an editor selecting stories for an
AI agent newsletter.

Select the best 5-7 articles.
${state.userFeedback ? `
HUMAN PREFERENCE / INSTRUCTIONS:
"${state.userFeedback}"
Please prioritize stories that match this specific user instruction.
` : ""}
Prioritize:

- AI agents
- autonomous AI
- agent frameworks
- AI agent products
- agent tooling
- agent research
- developer ecosystem
- recent developments
- credible sources

Avoid:

- duplicates
- generic AI stories
- SEO spam
- unrelated AI content
- low-quality sources

Articles:

${articleText}

Respond with ONLY a valid JSON object (no markdown,
no code fences) with exactly this structure:
{
  "selected": [
    { "url": string, "reason": string }
  ]
}
`)
  ]);

  const selected: Article[] = [];

  for (const item of response.selected) {

    const article =
      state.articles.find(
        a => a.url === item.url
      );

    if (article) {
      selected.push(article);
    }
  }

  return {
    selectedArticles: selected.slice(0, 7),

    logs: [
      `Editor selected ${Math.min(selected.length, 7)} articles from ${state.articles.length} results`
    ],
  };
}

const SummarySchema = z.object({
  summary: z.string(),

  whyItMatters: z.string(),

  takeaway: z.string(),
});

export async function summarizeNode(
  state: NewsletterStateType
) {

  const summaries: ArticleSummary[] = [];
  const logs: string[] = [];

  for (
    const article of state.selectedArticles
  ) {

    const summarizer =
      llm.withStructuredOutput(
        SummarySchema,
        {
          method: "jsonMode"
        }
      );

    const response =
      await summarizer.invoke([
        new HumanMessage(`
Summarize this article for a professional
AI agents newsletter.

Do not invent facts.

ARTICLE TITLE:
${article.title}

SOURCE:
${article.url}

ARTICLE CONTENT:
${article.content.slice(0, 6000)}

Respond with ONLY a valid JSON object (no markdown,
no code fences) with exactly these keys:
{
  "summary": string,
  "whyItMatters": string,
  "takeaway": string
}
`)
      ]);

    summaries.push({
      title: article.title,

      url: article.url,

      summary:
        response.summary,

      whyItMatters:
        response.whyItMatters,

      takeaway:
        response.takeaway,
    });

    logs.push(`[BROWSER:ANALYZING] analyzed & extracted key takeaways from "${article.title.slice(0, 60)}"`);
  }

  logs.push(`Generated ${summaries.length} article summaries`);

  return {
    summaries,

    logs,
  };
}

const NewsletterSchema = z.object({
  subject: z.string(),

  markdown: z.string(),
});

export async function writerNode(
  state: NewsletterStateType
) {

  const content =
    state.summaries
      .map(
        (item, index) => `
## ${index + 1}. ${item.title}

Summary:
${item.summary}

Why it matters:
${item.whyItMatters}

Key takeaway:
${item.takeaway}

Source:
${item.url}
`
      )
      .join("\n\n");

  const writer =
    llm.withStructuredOutput(
      NewsletterSchema,
      {
        method: "jsonMode"
      }
    );

  const response = await writer.invoke([
    new HumanMessage(`
You are the senior editor of a weekly AI
newsletter.

Original user goal:

${state.goal || "Create a weekly newsletter on latest AI agent news and send it to our subscribers."}

Create a polished newsletter.

Requirements:

- 5-7 stories
- Strong subject line
- Short introduction
- Clear headings
- Concise writing
- Explain why stories matter
- Include real source links: You MUST use the exact URLs provided in the stories below (e.g., [Read source](url)). DO NOT use placeholders like [Insert Link] or [Source: Citation].
- Professional tone
- No fabricated claims
- End with Key Takeaways
- Markdown format

Stories to feature (with verified sources):

${content}

Respond with ONLY a valid JSON object (no markdown
wrapping or code fences) with exactly these keys:
{
  "subject": string,
  "markdown": string
}
`)
  ]);

  return {
    newsletter: response,

    logs: [
      "Newsletter draft generated"
    ],
  };
}


const CritiqueSchema = z.object({
  approved: z.boolean(),

  score: z.number(),

  issues: z.array(
    z.string()
  ),

  improvements: z.array(
    z.string()
  ),
});

export async function criticNode(
  state: NewsletterStateType
) {

  if (!state.newsletter) {
    throw new Error(
      "Newsletter does not exist"
    );
  }

  const storiesSummary =
    (state.summaries || [])
      .map(
        (s, i) => `Story ${i + 1}: ${s.title} | URL: ${s.url} | Summary: ${s.summary}`
      )
      .join("\n\n");

  const critic =
    llm.withStructuredOutput(
      CritiqueSchema,
      {
        method: "jsonMode"
      }
    );

  const response =
    await critic.invoke([
      new HumanMessage(`
You are a strict quality-control reviewer for an AI newsletter.

ORIGINAL USER GOAL:
${state.goal || "Create a weekly newsletter on latest AI agent news and send it to our subscribers."}

SUPPLIED RESEARCH STORIES (Source material):
${storiesSummary || "Summaries from researched articles"}

GENERATED NEWSLETTER:
${state.newsletter.markdown}

Check:
1. Are there 5-7 stories?
2. Are the stories relevant to AI agents?
3. Are real source links/URLs included (not placeholders)?
4. Are claims supported by the supplied research material?
5. Are there duplicate stories?
6. Is the writing clear, professional, and engaging?
7. Is anything fabricated?
8. Does it satisfy the original user goal?
9. Is the subject line appropriate?

Give a score from 0 to 100.
Approve only if the newsletter is ready for delivery (score >= 80).
If something is wrong, list the specific problems in 'issues' and actionable suggestions in 'improvements'.

Respond with ONLY a valid JSON object (no markdown,
no code fences) with exactly these keys:
{
  "approved": boolean,
  "score": number,
  "issues": string[],
  "improvements": string[]
}
`)
    ]);

  return {
    critique: response,

    approved: response.approved,

    logs: [
      `Self-review completed: ${response.score}/100`
    ],
  };
}


export async function revisionNode(
  state: NewsletterStateType
) {

  if (!state.newsletter) {
    throw new Error(
      "Newsletter does not exist"
    );
  }

  if (!state.critique) {
    throw new Error(
      "Critique does not exist"
    );
  }

  const storiesSummary =
    (state.summaries || [])
      .map(
        (s, i) => `Story ${i + 1}: ${s.title} | URL: ${s.url} | Summary: ${s.summary}`
      )
      .join("\n\n");

  const writer =
    llm.withStructuredOutput(
      NewsletterSchema,
      {
        method: "jsonMode"
      }
    );

  const response =
    await writer.invoke([
      new HumanMessage(`
You are revising an AI newsletter after a strict editorial review.

ORIGINAL USER GOAL:
${state.goal || "Create a weekly newsletter on latest AI agent news and send it to our subscribers."}

SUPPLIED RESEARCH STORIES (with actual URLs):
${storiesSummary}

CURRENT NEWSLETTER:
${state.newsletter.markdown}

CURRENT SUBJECT:
${state.newsletter.subject}

EDITORIAL REVIEW:
Score: ${state.critique.score}/100
Issues Identified:
${state.critique.issues.join("\n")}

Improvement Requests:
${state.critique.improvements.join("\n")}

Instructions for Revision:
- Fix every problem identified in the review.
- Ensure all real URLs from the supplied research stories are used (e.g. [Read more](url)). Never leave placeholder links like [Source: Link].
- Do not invent information.
- Keep the original useful content.
- Return the complete revised newsletter.

Respond with ONLY a valid JSON object (no markdown
wrapping or code fences) with exactly these keys:
{
  "subject": string,
  "markdown": string
}
`)
    ]);

  return {
    newsletter: response,

    revisionCount:
      state.revisionCount + 1,

    logs: [
      `Newsletter revised after critique (revision ${state.revisionCount + 1})`
    ],
  };
}

export async function outputNode(
  state: NewsletterStateType
) {

  if (!state.newsletter) {
    throw new Error(
      "Newsletter does not exist"
    );
  }

  const files =
    await generateNewsletterFiles(
      state.newsletter
    );

  return {
    outputFiles: {
      markdown:
        files.markdownPath,

      html:
        files.htmlPath,
    },

    logs: [
      `Newsletter saved to Markdown`,
      `Newsletter saved to HTML`,
      `Newsletter is ready to send to subscribers`,
    ],
  };
}




async function invokeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const message =
        error instanceof Error ? error.message : String(error);

      const isTemporary =
        message.includes("503") ||
        message.includes("high demand") ||
        message.includes("429") ||
        message.includes("temporarily");

      if (!isTemporary || attempt === retries) {
        throw error;
      }

      const delay = attempt * 3000;

      console.log(
        `Gemini temporarily unavailable. Retry ${attempt}/${retries} in ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}













