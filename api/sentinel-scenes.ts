import { fetchSentinelScenes, SentinelError } from "../src/server/sentinel";

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
    res.status(405).json({ error: "Use POST for Sentinel scene searches." });
    return;
  }

  try {
    const scenes = await fetchSentinelScenes(req.body as Parameters<typeof fetchSentinelScenes>[0], {
      COPERNICUS_CLIENT_ID: process.env.COPERNICUS_CLIENT_ID,
      COPERNICUS_CLIENT_SECRET: process.env.COPERNICUS_CLIENT_SECRET,
      SENTINELHUB_CLIENT_ID: process.env.SENTINELHUB_CLIENT_ID,
      SENTINELHUB_CLIENT_SECRET: process.env.SENTINELHUB_CLIENT_SECRET,
    });

    res.status(200).json({ scenes });
  } catch (error) {
    const status = error instanceof SentinelError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Sentinel scene search failed.";
    res.status(status).json({ error: message });
  }
}
