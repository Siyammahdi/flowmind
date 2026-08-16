import { AgentRequestError, userMessageForCode } from "@/lib/agent/errors";
import { runWebflowAgent } from "@/lib/agent/cursor-agent";
import type { AgentStreamEvent } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function encodeEvent(event: AgentStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        message: "Invalid JSON body.",
        events: [],
      },
      { status: 400 },
    );
  }

  const prompt =
    typeof body === "object" &&
    body !== null &&
    "prompt" in body &&
    typeof body.prompt === "string"
      ? body.prompt.trim()
      : "";

  if (!prompt) {
    return Response.json(
      {
        success: false,
        code: "empty_prompt",
        message: userMessageForCode("empty_prompt"),
        events: [],
      },
      { status: 400 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runWebflowAgent({
          prompt,
          onEvent: (event) => {
            controller.enqueue(encodeEvent({ type: "activity", event }));
          },
        });
        controller.enqueue(
          encodeEvent({
            type: "done",
            success: result.success,
            message: result.message,
          }),
        );
      } catch (error) {
        const mapped =
          error instanceof AgentRequestError
            ? error
            : new AgentRequestError(
                "unexpected_response",
                userMessageForCode("unexpected_response"),
                500,
              );
        controller.enqueue(
          encodeEvent({
            type: "error",
            code: mapped.code,
            message: mapped.message,
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
