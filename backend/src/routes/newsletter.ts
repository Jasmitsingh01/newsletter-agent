import {
  Router,
  Request,
  Response,
} from "express";

import {
  runNewsletterAgent,
  approveNewsletterResearch,
  refineNewsletterResearch,
  getJob,
  subscribeToJob,
  sendNewsletterToSubscribers,
} from "../services/newsletterAgent.js";

const router =
  Router();


  router.post(
  "/run",
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        goal,
        mode = "autonomous",
      } = req.body;

      if (
        !goal ||
        typeof goal !== "string"
      ) {

        return res.status(400).json({
          success: false,
          error:
            "goal is required",
        });
      }

      if (
        mode !== "autonomous" &&
        mode !== "human"
      ) {

        return res.status(400).json({
          success: false,
          error:
            "mode must be autonomous or human",
        });
      }

      const result =
        await runNewsletterAgent(
          goal,
          mode
        );

      return res.json({
        success: true,

        ...result,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);
router.get(
  "/jobs/:jobId",
  (
    req: Request,
    res: Response
  ) => {

    const job =
      getJob(
        req.params.jobId as string
      );

    if (!job) {

      return res.status(404).json({
        success: false,
        error: "Job not found",
      });
    }

    return res.json({
      success: true,
      job,
    });
  }
);

router.post(
  "/jobs/:jobId/send",
  async (req: Request, res: Response) => {
    try {
      const delivery = await sendNewsletterToSubscribers(req.params.jobId as string);
      return res.json({ success: true, delivery });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

router.get(
  "/jobs/:jobId/stream",
  (
    req: Request,
    res: Response
  ) => {

    const jobId =
      req.params.jobId as string;

    res.setHeader(
      "Content-Type",
      "text/event-stream"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.flushHeaders();

    try {

      subscribeToJob(
        jobId,
        res
      );

    } catch (error) {

      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        })}\n\n`
      );

      res.end();

      return;
    }

    req.on(
      "close",
      () => {
        res.end();
      }
    );
  }
);
router.post(
  "/jobs/:jobId/approve",
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const job =
        await approveNewsletterResearch(
          req.params.jobId as string
        );

      return res.json({
        success: true,

        status:
          job.status,
      });

    } catch (error) {

      return res.status(400).json({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

router.post(
  "/jobs/:jobId/refine",
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        feedback,
        references,
      } = req.body;

      if (
        !feedback ||
        typeof feedback !== "string"
      ) {

        return res.status(400).json({
          success: false,
          error:
            "feedback is required to refine research",
        });
      }

      const job =
        await refineNewsletterResearch(
          req.params.jobId as string,
          feedback,
          Array.isArray(references) ? references : []
        );

      return res.json({
        success: true,

        status:
          job.status,
      });

    } catch (error) {

      return res.status(400).json({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

export default router;
