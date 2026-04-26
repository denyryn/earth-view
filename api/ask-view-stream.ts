import { AskViewError, streamAskAboutView } from "../src/server/askView";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (status: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  end: (chunk?: string) => void;
  headersSent?: boolean;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST for Ask View stream requests." });
    return;
  }

  function writeSse(event: string, data: unknown) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    res.status(200);
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");

    await streamAskAboutView(req.body as Parameters<typeof streamAskAboutView>[0], {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    }, (event) => writeSse(event.type, event));
    res.end();
  } catch (error) {
    const status = error instanceof AskViewError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Ask View stream failed.";

    if (!res.headersSent) {
      res.status(status).json({ error: message });
      return;
    }

    writeSse("error", { type: "error", error: message });
    res.end();
  }
}
