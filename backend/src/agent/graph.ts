import {
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

import {
  NewsletterState,
} from "./state.js";

import {
  plannerNode,
  researchNode,
  rankArticlesNode,
  summarizeNode,
  writerNode,
  criticNode,
  revisionNode,
  outputNode,
} from "./nodes.js";


export function createAutonomousGraph() {

  const graph =
    new StateGraph(
      NewsletterState
    )

      .addNode(
        "planner",
        plannerNode
      )

      .addNode(
        "research",
        researchNode
      )

      .addNode(
        "rank",
        rankArticlesNode
      )

      .addNode(
        "summarize",
        summarizeNode
      )

      .addNode(
        "writer",
        writerNode
      )

      .addNode(
        "critic",
        criticNode
      )

      .addNode(
        "revision",
        revisionNode
      )

      .addNode(
        "output",
        outputNode
      )

      .addEdge(
        START,
        "planner"
      )

      .addEdge(
        "planner",
        "research"
      )

      .addEdge(
        "research",
        "rank"
      )

      .addEdge(
        "rank",
        "summarize"
      )

      .addEdge(
        "summarize",
        "writer"
      )

      .addEdge(
        "writer",
        "critic"
      )

      .addConditionalEdges(
        "critic",

        (state) => {

          if (
            state.approved
          ) {
            return "output";
          }

          if (
            state.revisionCount >= 2
          ) {
            return "output";
          }

          return "revision";
        },

        {
          output: "output",
          revision: "revision",
        }
      )

      .addEdge(
        "revision",
        "critic"
      )

      .addEdge(
        "output",
        END
      );

  return graph.compile();
}


export function createHumanResearchGraph() {

  const graph =
    new StateGraph(
      NewsletterState
    )

      .addNode(
        "planner",
        plannerNode
      )

      .addNode(
        "research",
        researchNode
      )

      .addNode(
        "rank",
        rankArticlesNode
      )

      .addEdge(
        START,
        "planner"
      )

      .addEdge(
        "planner",
        "research"
      )

      .addEdge(
        "research",
        "rank"
      )

      .addEdge(
        "rank",
        END
      );

  return graph.compile();
}
export function createHumanContinuationGraph() {

  const graph =
    new StateGraph(
      NewsletterState
    )

      .addNode(
        "summarize",
        summarizeNode
      )

      .addNode(
        "writer",
        writerNode
      )

      .addNode(
        "critic",
        criticNode
      )

      .addNode(
        "revision",
        revisionNode
      )

      .addNode(
        "output",
        outputNode
      )

      .addEdge(
        START,
        "summarize"
      )

      .addEdge(
        "summarize",
        "writer"
      )

      .addEdge(
        "writer",
        "critic"
      )

      .addConditionalEdges(
        "critic",

        (state) => {

          if (
            state.approved
          ) {
            return "output";
          }

          if (
            state.revisionCount >= 2
          ) {
            return "output";
          }

          return "revision";
        },

        {
          output: "output",
          revision: "revision",
        }
      )

      .addEdge(
        "revision",
        "critic"
      )

      .addEdge(
        "output",
        END
      );

  return graph.compile();
}





