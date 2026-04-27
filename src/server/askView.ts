import type { BoundingBox } from "../types/imagery";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_MODEL = "gpt-5.2";
const ANTHROPIC_MODEL = "claude-opus-4-1-20250805";

export type AskProvider = "openai" | "anthropic";

export type AskChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskViewContext = {
  coordinates: string;
  lat: number;
  lon: number;
  date: string;
  captureLabel: string;
  providerName: string;
  providerId: string;
  satellite: string;
  category: string;
  resolutionMeters: number;
  sentinelVariantId?: string;
  bbox?: BoundingBox | null;
  imageryZoomDegrees: number;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

type AskViewRequest = {
  provider: AskProvider;
  messages: AskChatMessage[];
  viewContext: AskViewContext;
  imageDataUrl?: string;
  viewBriefing?: string | null;
};

type AskViewEnv = {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
  incomplete_details?: {
    reason?: string;
  };
  usage?: unknown;
};

type OpenAIOutputItem = NonNullable<OpenAIResponse["output"]>[number];

type AnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  usage?: unknown;
};

export type AskViewStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "done"; message: string; viewBriefing: string; usage?: unknown };

export class AskViewError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AskViewError";
    this.status = status;
  }
}

function requireKey(value: string | undefined, provider: AskProvider) {
  if (!value) {
    throw new AskViewError(
      `${provider === "openai" ? "OpenAI" : "Anthropic"} API key is not configured.`,
      503,
    );
  }

  return value;
}

function validateRequest(input: AskViewRequest) {
  if (input.provider !== "openai" && input.provider !== "anthropic") {
    throw new AskViewError("Unsupported AI provider.", 400);
  }

  if (!input.viewContext) {
    throw new AskViewError("Missing view context.", 400);
  }

  const messages = Array.isArray(input.messages) ? input.messages.slice(-12) : [];
  const hasPriorAssistant = messages.some((message) => message.role === "assistant");

  if (!hasPriorAssistant && !input.imageDataUrl) {
    throw new AskViewError("Missing image for the initial view analysis.", 400);
  }

  return {
    provider: input.provider,
    messages,
    viewContext: input.viewContext,
    imageDataUrl: input.imageDataUrl,
    viewBriefing: input.viewBriefing ?? null,
  };
}

function viewContextText(viewContext: AskViewContext) {
  return JSON.stringify(
    {
      coordinates: viewContext.coordinates,
      lat: viewContext.lat,
      lon: viewContext.lon,
      date: viewContext.date,
      captureLabel: viewContext.captureLabel,
      layer: viewContext.providerName,
      providerId: viewContext.providerId,
      satellite: viewContext.satellite,
      category: viewContext.category,
      resolutionMeters: viewContext.resolutionMeters,
      sentinelVariantId: viewContext.sentinelVariantId,
      bbox: viewContext.bbox,
      imageryZoomDegrees: viewContext.imageryZoomDegrees,
      renderedImage: {
        width: viewContext.imageWidth,
        height: viewContext.imageHeight,
      },
    },
    null,
    2,
  );
}

function systemPrompt() {
  return [
    "You are analyzing satellite imagery for an exploratory Earth-observation app.",
    "Use the supplied image and metadata to explain what is visible, what the imagery layer is useful for, and what can only be inferred uncertainly.",
    "Distinguish visible evidence from inference. Mention uncertainty and avoid exact identification when the imagery cannot support it.",
    "For radar and false-color imagery, explain how to interpret the colors or backscatter before drawing conclusions.",
    "If web search tools are available and the user asks for online/current/contextual identification, use web search and cite sources. If no web search is used, say the answer is based on the image, metadata, and general remote-sensing knowledge.",
    "Keep answers useful and concise. For the hidden view briefing, summarize stable visual/context facts for follow-up turns.",
  ].join("\n");
}

function currentQuestion(messages: AskChatMessage[]) {
  return messages.at(-1)?.content?.trim() || "Explain what is visible in this satellite view and what this imagery layer is useful for.";
}

function briefingInstruction() {
  return [
    "Return the response in this exact format:",
    "ANSWER:",
    "<user-facing answer>",
    "",
    "VIEW_BRIEFING:",
    "<compact hidden summary of the image, metadata, caveats, and notable visible features for follow-up turns>",
  ].join("\n");
}

function splitBriefing(text: string) {
  const marker = "VIEW_BRIEFING:";
  const answerMarker = "ANSWER:";
  const markerIndex = text.indexOf(marker);
  const rawAnswer = markerIndex >= 0 ? text.slice(0, markerIndex) : text;
  const message = rawAnswer.replace(answerMarker, "").trim();
  const viewBriefing = markerIndex >= 0 ? text.slice(markerIndex + marker.length).trim() : "";

  return {
    message: message || text.trim(),
    viewBriefing,
  };
}

function nextSseChunk(buffer: string) {
  const match = buffer.match(/\r?\n\r?\n/);

  if (!match || match.index === undefined) {
    return null;
  }

  return {
    chunk: buffer.slice(0, match.index),
    rest: buffer.slice(match.index + match[0].length),
  };
}

function parseSseData(chunk: string) {
  return chunk
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
}

class BriefingStreamSplitter {
  private raw = "";
  private sent = 0;
  private readonly marker = "VIEW_BRIEFING:";
  private readonly answerMarker = "ANSWER:";

  feed(delta: string) {
    this.raw += delta;
    const markerIndex = this.raw.indexOf(this.marker);
    const rawAnswerEnd =
      markerIndex >= 0
        ? markerIndex
        : Math.max(0, this.raw.length - (this.marker.length - 1));
    const answer = this.cleanAnswer(this.raw.slice(0, rawAnswerEnd));

    if (answer.length <= this.sent) {
      return "";
    }

    const nextDelta = answer.slice(this.sent);
    this.sent = answer.length;
    return nextDelta;
  }

  done() {
    const parsed = splitBriefing(this.raw);
    const finalDelta = parsed.message.length > this.sent ? parsed.message.slice(this.sent) : "";
    this.sent = parsed.message.length;

    return {
      ...parsed,
      finalDelta,
    };
  }

  private cleanAnswer(value: string) {
    return value.replace(this.answerMarker, "").trimStart();
  }
}

function askViewUserText(request: ReturnType<typeof validateRequest>) {
  const isInitial = Boolean(request.imageDataUrl);
  const context = viewContextText(request.viewContext);

  return isInitial
    ? [
        "Analyze the current satellite view.",
        "View context:",
        context,
        `Question: ${currentQuestion(request.messages)}`,
        briefingInstruction(),
      ].join("\n\n")
    : [
        "Continue the satellite imagery discussion.",
        request.viewBriefing ? `Retained view briefing:\n${request.viewBriefing}` : "",
        `View context:\n${context}`,
        `Question: ${currentQuestion(request.messages)}`,
        briefingInstruction(),
      ].filter(Boolean).join("\n\n");
}

function openAiBody(request: ReturnType<typeof validateRequest>, stream = false) {
  const userText = askViewUserText(request);
  const input = [
    ...request.messages.slice(0, -1).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: "user",
      content: [
        { type: "input_text", text: userText },
        ...(request.imageDataUrl
          ? [{ type: "input_image", image_url: request.imageDataUrl }]
          : []),
      ],
    },
  ];

  return {
    model: OPENAI_MODEL,
    instructions: systemPrompt(),
    input,
    reasoning: {
      effort: "high",
    },
    tools: [
      {
        type: "web_search",
        external_web_access: true,
        user_location: {
          type: "approximate",
          country: "US",
          timezone: "America/New_York",
        },
      },
    ],
    tool_choice: "auto",
    include: ["web_search_call.action.sources"],
    max_output_tokens: 8000,
    stream,
  };
}

function anthropicBody(request: ReturnType<typeof validateRequest>, stream = false) {
  const userText = askViewUserText(request);
  const image = request.imageDataUrl ? dataUrlParts(request.imageDataUrl) : null;
  const priorMessages = request.messages.slice(0, -1).map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const content = [
    ...(image
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.data,
            },
          },
        ]
      : []),
    {
      type: "text",
      text: userText,
    },
  ];

  return {
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    system: systemPrompt(),
    messages: [
      ...priorMessages,
      {
        role: "user",
        content,
      },
    ],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
        user_location: {
          type: "approximate",
          country: "US",
          timezone: "America/New_York",
        },
      },
    ],
    stream,
  };
}

function openAiText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return (response.output ?? [])
    .flatMap((output) => output.content ?? [])
    .map((content) => content.text ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function anthropicText(response: AnthropicResponse) {
  return (response.content ?? [])
    .map((content) => content.text ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function callOpenAi(request: ReturnType<typeof validateRequest>, apiKey: string) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(openAiBody(request)),
  });

  if (!response.ok) {
    throw new AskViewError(await response.text() || "OpenAI request failed.", response.status);
  }

  const body = (await response.json()) as OpenAIResponse;
  const parsed = splitBriefing(openAiText(body));

  if (!parsed.message.trim()) {
    throw new AskViewError(
      body.incomplete_details?.reason
        ? `OpenAI finished without analysis text. Reason: ${body.incomplete_details.reason}.`
        : body.error?.message ?? "OpenAI finished without returning analysis text.",
      502,
    );
  }

  return {
    ...parsed,
    usage: body.usage,
  };
}

function dataUrlParts(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new AskViewError("Invalid image data URL.", 400);
  }

  return {
    mediaType: match[1],
    data: match[2],
  };
}

async function callAnthropic(request: ReturnType<typeof validateRequest>, apiKey: string) {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(anthropicBody(request)),
  });

  if (!response.ok) {
    throw new AskViewError(await response.text() || "Anthropic request failed.", response.status);
  }

  const body = (await response.json()) as AnthropicResponse;
  const parsed = splitBriefing(anthropicText(body));

  return {
    ...parsed,
    usage: body.usage,
  };
}

async function readEventStream(response: Response, onEvent: (event: unknown) => Promise<void> | void) {
  if (!response.body) {
    throw new AskViewError("AI provider returned an empty stream.", 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let next = nextSseChunk(buffer);

    while (next) {
      buffer = next.rest;
      const data = parseSseData(next.chunk);

      if (data && data !== "[DONE]") {
        await onEvent(JSON.parse(data));
      }

      next = nextSseChunk(buffer);
    }
  }

  const trailingData = parseSseData(buffer);

  if (trailingData && trailingData !== "[DONE]") {
    await onEvent(JSON.parse(trailingData));
  }
}

async function callOpenAiStream(
  request: ReturnType<typeof validateRequest>,
  apiKey: string,
  onEvent: (event: AskViewStreamEvent) => Promise<void> | void,
) {
  const splitter = new BriefingStreamSplitter();
  let usage: unknown;
  let completedText = "";
  let sawTextDelta = false;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(openAiBody(request, true)),
  });

  if (!response.ok) {
    throw new AskViewError(await response.text() || "OpenAI request failed.", response.status);
  }

  await readEventStream(response, async (event) => {
    const typedEvent = event as {
      type?: string;
      delta?: string;
      part?: { type?: string; text?: string };
      item?: OpenAIOutputItem;
      response?: OpenAIResponse;
      error?: { message?: string };
    };

    if (typedEvent.type === "response.failed" || typedEvent.type === "error") {
      throw new AskViewError(
        typedEvent.error?.message ?? typedEvent.response?.error?.message ?? "OpenAI stream failed.",
        502,
      );
    }

    if (typedEvent.type === "response.output_text.delta" && typedEvent.delta) {
      sawTextDelta = true;
      const visibleDelta = splitter.feed(typedEvent.delta);

      if (visibleDelta) {
        await onEvent({ type: "delta", delta: visibleDelta });
      }
    }

    if (typedEvent.type === "response.content_part.done" && typedEvent.part?.type === "output_text") {
      completedText = typedEvent.part.text ?? completedText;
    }

    if (typedEvent.type === "response.output_item.done" && typedEvent.item) {
      completedText = openAiText({ output: [typedEvent.item] }) || completedText;
    }

    if (typedEvent.type === "response.completed") {
      usage = typedEvent.response?.usage;
      completedText = typedEvent.response ? openAiText(typedEvent.response) || completedText : completedText;
    }

    if (typedEvent.type === "response.incomplete") {
      throw new AskViewError(
        typedEvent.response?.incomplete_details?.reason
          ? `OpenAI response incomplete: ${typedEvent.response.incomplete_details.reason}.`
          : "OpenAI response incomplete.",
        502,
      );
    }
  });

  if (completedText && !sawTextDelta) {
    splitter.feed(completedText);
  }

  const parsed = splitter.done();

  if (parsed.finalDelta) {
    await onEvent({ type: "delta", delta: parsed.finalDelta });
  }

  if (!parsed.message.trim()) {
    throw new AskViewError("OpenAI finished without returning analysis text.", 502);
  }

  await onEvent({ type: "done", message: parsed.message, viewBriefing: parsed.viewBriefing, usage });
}

async function callAnthropicStream(
  request: ReturnType<typeof validateRequest>,
  apiKey: string,
  onEvent: (event: AskViewStreamEvent) => Promise<void> | void,
) {
  const splitter = new BriefingStreamSplitter();
  let usage: unknown;

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(anthropicBody(request, true)),
  });

  if (!response.ok) {
    throw new AskViewError(await response.text() || "Anthropic request failed.", response.status);
  }

  await readEventStream(response, async (event) => {
    const typedEvent = event as {
      type?: string;
      delta?: { type?: string; text?: string };
      error?: { message?: string };
      usage?: unknown;
    };

    if (typedEvent.type === "error") {
      throw new AskViewError(typedEvent.error?.message ?? "Anthropic stream failed.", 502);
    }

    if (typedEvent.type === "content_block_delta" && typedEvent.delta?.type === "text_delta") {
      const visibleDelta = splitter.feed(typedEvent.delta.text ?? "");

      if (visibleDelta) {
        await onEvent({ type: "delta", delta: visibleDelta });
      }
    }

    if (typedEvent.type === "message_delta") {
      usage = typedEvent.usage;
    }
  });

  const parsed = splitter.done();

  if (parsed.finalDelta) {
    await onEvent({ type: "delta", delta: parsed.finalDelta });
  }

  if (!parsed.message.trim()) {
    throw new AskViewError("Anthropic finished without returning analysis text.", 502);
  }

  await onEvent({ type: "done", message: parsed.message, viewBriefing: parsed.viewBriefing, usage });
}

export async function askAboutView(input: AskViewRequest, env: AskViewEnv) {
  const request = validateRequest(input);

  if (request.provider === "openai") {
    return callOpenAi(request, requireKey(env.OPENAI_API_KEY, "openai"));
  }

  return callAnthropic(request, requireKey(env.ANTHROPIC_API_KEY, "anthropic"));
}

export async function streamAskAboutView(
  input: AskViewRequest,
  env: AskViewEnv,
  onEvent: (event: AskViewStreamEvent) => Promise<void> | void,
) {
  const request = validateRequest(input);

  if (request.provider === "openai") {
    await callOpenAiStream(request, requireKey(env.OPENAI_API_KEY, "openai"), onEvent);
    return;
  }

  await callAnthropicStream(request, requireKey(env.ANTHROPIC_API_KEY, "anthropic"), onEvent);
}
