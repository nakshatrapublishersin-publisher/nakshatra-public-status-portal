/**
 * NAKSHATRA PUBLISHERS
 * NIYOMITO BHAG
 * PUBLIC STATUS PORTAL
 *
 * Cloudflare Worker
 * Version 1.1
 */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzBqV6cuhA2CYwuCEwwMuRTKWxmMkpRfZhDFsyhxBUHiy3u3Co2N4Zb2P2JrY_28yKMJQ/exec";

const MAX_ID_LENGTH = 60;
const REQUEST_TIMEOUT = 15000;


/* =========================================
   JSON RESPONSE
========================================= */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}


/* =========================================
   STATUS API
========================================= */

async function handleStatusRequest(request, env) {

  if (request.method !== "POST") {
    return jsonResponse({
      success: false,
      message: "Method not allowed."
    }, 405);
  }

  if (!env.PUBLIC_API_SECRET) {
    console.error("PUBLIC_API_SECRET is not configured.");

    return jsonResponse({
      success: false,
      message: "Status service is temporarily unavailable."
    }, 503);
  }

  let input;

  try {
    input = await request.json();
  } catch (error) {
    return jsonResponse({
      success: false,
      message: "Invalid request. Please try again."
    }, 400);
  }

  const submissionId = String(
    input.submissionId || ""
  ).trim().toUpperCase();

  if (!submissionId) {
    return jsonResponse({
      success: false,
      message: "Please enter your Submission ID."
    }, 400);
  }

  if (
    submissionId.length > MAX_ID_LENGTH ||
    !/^[A-Z0-9-]+$/.test(submissionId)
  ) {
    return jsonResponse({
      success: false,
      message: "Please enter a valid Submission ID."
    }, 400);
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        action: "CHECK_STATUS",
        submissionId: submissionId,
        apiSecret: env.PUBLIC_API_SECRET
      }),

      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        "Apps Script returned HTTP " + response.status
      );
    }

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        "Invalid response received from Apps Script."
      );
    }

    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      throw new Error(
        "Unexpected API response format."
      );
    }

    /*
     * Preserve the Apps Script response.
     * The frontend will render the editorial
     * history and timeline using this data.
     */

    return jsonResponse(result, 200);

  } catch (error) {

    console.error(
      "Public Status API Error:",
      error.message || error
    );

    if (error.name === "AbortError") {
      return jsonResponse({
        success: false,
        message: "The status service took too long to respond. Please try again."
      }, 504);
    }

    return jsonResponse({
      success: false,
      message: "Unable to retrieve your submission status. Please try again later."
    }, 502);

  } finally {

    clearTimeout(timeout);

  }

}


/* =========================================
   MAIN WORKER
========================================= */

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/api/status") {
      return handleStatusRequest(request, env);
    }

    /*
     * Serve the public portal.
     */

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "Nakshatra Publishers | Public Status Portal",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );

  }

};
