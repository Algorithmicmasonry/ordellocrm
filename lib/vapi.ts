/**
 * Vapi integration — outbound call triggering and next-call scheduling.
 *
 * Two exported functions:
 *  - triggerOutboundCall: fires a call via Vapi right now
 *  - scheduleNextCall: writes aiNextCallAt to the DB so the cron picks it up
 */

import { db } from "@/lib/db";
import {
  generateSystemPrompt,
  getVapiVariables,
  getNextCallTime,
  type CallStage,
  type OrderContext,
} from "@/lib/ai-agent";

const VAPI_BASE_URL = "https://api.vapi.ai";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Environment variable ${key} is not set`);
  return value;
}

async function vapiPost(
  path: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  console.log(`[vapi] POST ${path} payload:`, JSON.stringify(body, null, 2));
  try {
    const res = await fetch(`${VAPI_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("VAPI_PRIVATE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[vapi] POST ${path} failed — status=${res.status} body=${text}`);
      throw new Error(`Vapi API ${res.status}: ${text}`);
    }

    const data = await res.json() as Record<string, unknown>;
    console.log(`[vapi] POST ${path} success — response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error(`[vapi] POST ${path} threw:`, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// triggerOutboundCall
// ---------------------------------------------------------------------------

/**
 * Fires an outbound Vapi call for the given order attempt right now.
 *
 * - Builds system prompt + variable values from lib/ai-agent.ts
 * - POSTs to Vapi /call
 * - Creates an AiCallLog row
 * - Updates the Order (aiCallAttempts, aiCallStatus, clears aiNextCallAt)
 *
 * Returns the Vapi call ID.
 */
export async function triggerOutboundCall(
  order: OrderContext,
  attemptNumber: number,
  cycleNumber: number,
  stage: CallStage = "confirmation",
): Promise<string> {
  console.log(`[vapi] triggerOutboundCall — orderId=${order.id} orderNumber=${order.orderNumber} attempt=${attemptNumber} cycle=${cycleNumber} stage=${stage}`);

  try {
    const phoneNumberId = requireEnv("VAPI_PHONE_NUMBER_ID");
    const assistantId = requireEnv("VAPI_ASSISTANT_ID");

    const systemPrompt = generateSystemPrompt(order, stage);
    const variableValues = {
      ...getVapiVariables(order),
      systemPrompt, // used as {{systemPrompt}} in the Vapi assistant's system prompt field
    };

    console.log(`[vapi] variableValues:`, JSON.stringify(variableValues, null, 2));

    const payload = {
      phoneNumberId,
      assistantId,
      customer: {
        number: order.customerPhone,
        name: order.customerName,
      },
      assistantOverrides: {
        variableValues,
      },
      metadata: {
        orderId: order.id,
        attemptNumber,
        cycleNumber,
        stage,
      },
    };

    const response = await vapiPost("/call", payload);
    const vapiCallId = response.id as string;

    console.log(`[vapi] call created — vapiCallId=${vapiCallId}`);

    // Persist log + update order in parallel
    try {
      await Promise.all([
        db.aiCallLog.create({
          data: {
            orderId: order.id,
            attemptNumber,
            cycleNumber,
            vapiCallId,
          },
        }),
        db.order.update({
          where: { id: order.id },
          data: {
            aiCallAttempts: attemptNumber,
            aiCallStatus: "IN_PROGRESS",
            aiNextCallAt: null,
          },
        }),
      ]);
      console.log(`[vapi] DB updated — orderId=${order.id} aiCallStatus=IN_PROGRESS`);
    } catch (dbErr) {
      console.error(`[vapi] DB update failed after call created — vapiCallId=${vapiCallId}:`, dbErr);
      throw dbErr;
    }

    return vapiCallId;
  } catch (err) {
    console.error(`[vapi] triggerOutboundCall failed — orderId=${order.id} attempt=${attemptNumber}:`, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// scheduleNextCall
// ---------------------------------------------------------------------------

/**
 * Calculates when the next call attempt should fire and writes it to the DB.
 * The cron job (app/api/cron/ai-calls/route.ts) reads aiNextCallAt to decide
 * which orders to act on.
 *
 * If all 5 attempts in a cycle are exhausted:
 *  - Sets aiCallStatus = UNREACHABLE
 *  - Schedules the start of the next cycle 14 days out
 *  - Increments aiCycleNumber
 *
 * The admin can manually reassign UNREACHABLE orders to a human rep at any time.
 */
export async function scheduleNextCall(
  orderId: string,
  nextAttempt: number,
  cycleNumber: number,
  cycleStartAt?: Date,
): Promise<void> {
  console.log(`[vapi] scheduleNextCall — orderId=${orderId} nextAttempt=${nextAttempt} cycle=${cycleNumber}`);

  try {
    const now = new Date();

    if (nextAttempt > 5) {
      // All 5 attempts failed — go UNREACHABLE and queue cycle restart in 14 days
      const nextCycleNumber = cycleNumber + 1;
      const nextCycleStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const nextCallTime = getNextCallTime(1, nextCycleNumber, now, nextCycleStart);

      console.log(`[vapi] all attempts exhausted — marking UNREACHABLE, next cycle=${nextCycleNumber} starts=${nextCycleStart.toISOString()}`);

      await db.order.update({
        where: { id: orderId },
        data: {
          aiCallStatus: "UNREACHABLE",
          aiCycleNumber: nextCycleNumber,
          aiCycleStartAt: nextCycleStart,
          aiNextCallAt: nextCallTime,
        },
      });

      return;
    }

    const nextCallTime = getNextCallTime(nextAttempt, cycleNumber, now, cycleStartAt);
    console.log(`[vapi] scheduling attempt=${nextAttempt} at=${nextCallTime.toISOString()}`);

    await db.order.update({
      where: { id: orderId },
      data: {
        aiCallStatus: "PENDING",
        aiNextCallAt: nextCallTime,
      },
    });
  } catch (err) {
    console.error(`[vapi] scheduleNextCall failed — orderId=${orderId} nextAttempt=${nextAttempt}:`, err);
    throw err;
  }
}
