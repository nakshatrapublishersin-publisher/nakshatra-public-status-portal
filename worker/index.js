/**
 * NAKSHATRA PUBLISHERS
 * NIYOMITO BHAG
 * PUBLIC STATUS PORTAL
 *
 * Cloudflare Worker
 * Version 1.0
 */
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzBqV6cuhA2CYwuCEwwMuRTKWxmMkpRfZhDFsyhxBUHiy3u3Co2N4Zb2P2JrY_28yKMJQ/exec";
const MAX_ID_LENGTH = 60;
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    /*
     * PUBLIC STATUS API
     * POST /api/status
     */
    if (url.pathname === "/api/status") {
      if (request.method !== "POST") {
        return jsonResponse({
          success: false,
          message: "Method not allowed."
        }, 405);
      }
      try {
        if (!env.PUBLIC_API_SECRET) {
          throw new Error("API configuration unavailable.");
        }
        const input = await request.json();
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
          redirect: "follow"
        });
        if (!response.ok) {
          throw new Error("Editorial database unavailable.");
        }
        const result = await response.json();
        return jsonResponse(result, 200);
      } catch (error) {
        console.error("Status API error:", error);
        return jsonResponse({
          success: false,
          message: "Unable to retrieve your submission status. Please try again later."
        }, 500);
      }
    }
    /*
     * PUBLIC WEBSITE
     * All other requests are served from
     * the Cloudflare static assets directory.
     */
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response(
      "Nakshatra Publishers Public Status Portal",
      { status: 200 }
    );
  }
};
