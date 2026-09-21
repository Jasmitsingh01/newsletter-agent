import { Annotation } from "@langchain/langgraph";

export interface Article {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  score?: number;
  source?: string;
  screenshot?: string;
  links?: { text: string; href: string }[];
}

export interface ArticleSummary {
  title: string;
  url: string;
  summary: string;
  whyItMatters: string;
  takeaway: string;
}

export interface Newsletter {
  subject: string;
  markdown: string;
}

export interface Critique {
  approved: boolean;
  score: number;
  issues: string[];
  improvements: string[];
}

export const NewsletterState = Annotation.Root({
  goal: Annotation<string>,

  mode: Annotation<"autonomous" | "human">,

  plan: Annotation<any>,

  userFeedback: Annotation<string | undefined>({
    reducer: (_, value) => value,
    default: () => undefined,
  }),

  userReferences: Annotation<string[]>({
    reducer: (_, value) => value,
    default: () => [],
  }),

  searchQueries: Annotation<string[]>({
    reducer: (_, value) => value,
    default: () => [],
  }),

  articles: Annotation<Article[]>({
    reducer: (_, value) => value,
    default: () => [],
  }),

  selectedArticles: Annotation<Article[]>({
    reducer: (_, value) => value,
    default: () => [],
  }),

  summaries: Annotation<ArticleSummary[]>({
    reducer: (_, value) => value,
    default: () => [],
  }),

  newsletter: Annotation<Newsletter | undefined>,

  critique: Annotation<Critique | undefined>,

  approved: Annotation<boolean>({
    reducer: (_, value) => value,
    default: () => false,
  }),

  revisionCount: Annotation<number>({
    reducer: (_, value) => value,
    default: () => 0,
  }),

  logs: Annotation<string[]>({
    reducer: (previous, current) => [
      ...previous,
      ...current,
    ],
    default: () => [],
  }),

  outputFiles: Annotation<{
    markdown?: string;
    html?: string;
  }>({
    reducer: (_, value) => value,
    default: () => ({}),
  }),
});

export type NewsletterStateType = typeof NewsletterState.State;