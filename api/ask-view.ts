import { askAboutView, AskViewError } from "../src/server/askView";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (status: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST for Ask View requests." });
    return;
  }

  try {
    const result = await askAboutView(req.body as Parameters<typeof askAboutView>[0], {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    });

    res.status(200).json(result);
  } catch (error) {
    const status = error instanceof AskViewError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Ask View request failed.";
    res.status(status).json({ error: message });
  }
}
