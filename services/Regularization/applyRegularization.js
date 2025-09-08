import axios from "axios";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

import { extractDateRange } from "../OpenAIServices/extractDateRange.js";
import { getOpenAIActionResponse } from "../OpenAIServices/openAIActionService.js";

// const TZ = "Asia/Dubai";
const sessionStore = new Map(); // replace with Redis/DB

function getSession(employeeId) {
  if (!sessionStore.has(employeeId)) {
    sessionStore.set(employeeId, {
      status: "collecting",
      fields: { date: null, clockin: null, clockout: null, reason: null },
      missing: ["date", "clockin", "clockout", "reason"],
      id: null
    });
  }
  return sessionStore.get(employeeId);
}

function setSession(employeeId, data) {
  sessionStore.set(employeeId, { ...getSession(employeeId), ...data });
}



function validateFields({ date, clockinISO, clockoutISO, reason }) {
  const errs = [];
  if (!date) errs.push("date");
  if (!clockinISO) errs.push("clockin");
  if (!clockoutISO) errs.push("clockout");
  if (!reason) errs.push("reason");
  if (errs.length) return { valid: false, missing: errs };

  if (new Date(clockoutISO) <= new Date(clockinISO)) {
    return { valid: false, msg: "Clock-out must be after clock-in." };
  }
  if (dayjs(clockinISO).isAfter(dayjs())) {
    return { valid: false, msg: "Times cannot be in the future." };
  }
  return { valid: true };
}

export async function ApplyAttendanceRegularization(userMessage, employeeId, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
  const session = getSession(employeeId);

  // 1) Try to extract date if not yet known
  if (!session.fields.date) {
    const { fromDate, toDate, error: dateError } = await extractDateRange(userMessage);
    if (dateError) {
      return "Please tell me the date you want to regularize (e.g., 7 Aug 2025).";
    }
    console.log("Extracted date========== range:", fromDate, toDate);
    // Accept single-day ranges only
    if (fromDate && toDate && fromDate === toDate) {
      session.fields.date = fromDate;
      session.missing = session.missing.filter(m => m !== "date");
      setSession(employeeId, session);
    }
  }

  // 2) If we still don't have a date, ask for it and stop here
  if (!session.fields.date) {
    return "Please share the date to regularize (e.g., 7 Aug 2025).";
  }

  // 3) Ensure we have a regularization record ID for that date
  if (!session.id) {
    const userDate = session.fields.date; // already extracted from user prompt

    const url = `${baseUrl}/regularization/All?self=1&regularizedDate=${encodeURIComponent(userDate)}&fromDate=${encodeURIComponent(userDate)}&toDate=${encodeURIComponent(userDate)}`;

    const headers = { Authorization: authHeader, CompanyId: companyId };
    console.log("Fetching regularization data from URL:", url);
    const resp = await axios.get(url, { headers });
    const list = resp.data?.data?.list || [];
    if (!list.length) {
      return `I couldn’t find a regularization record for ${session.fields.date}. Please confirm the date or check with HR.`;
    }
    session.id = list[0].id; // or pick the correct one by matching date
    setSession(employeeId, session);
  }

  // 4) Ask LLM to fill remaining fields from THIS turn (don’t overwrite known)
  const validationPrompt = `
You are a strict form-filler. ALWAYS return JSON only.

Goal: Determine any new values in the user's latest message for the fields:
- date (YYYY-MM-DD) [already known: ${session.fields.date || "null"}]
- clockin (ISO datetime)
- clockout (ISO datetime)
- reason (string)

If times are given without dates, assume they refer to ${session.fields.date}.
Timezone is Asia/Dubai.

Return:
{
  "fields": { "date": null | "YYYY-MM-DD", "clockin": null | "ISO", "clockout": null | "ISO", "reason": null | "..." },
  "missing": ["date"|"clockin"|"clockout"|"reason", ...],
  "follow_up": "one short question asking for what's missing"
}

User: "${userMessage}"
KnownFields: ${JSON.stringify(session.fields)}
`;

  let llmJson;
  try {
    const llm = await getOpenAIActionResponse(validationPrompt);
    llmJson = JSON.parse(llm);
  } catch {
    // If LLM fails, just fall back to guided prompt
    llmJson = { fields: {}, missing: [], follow_up: null };
  }

  // 5) Merge newly-found fields, but don’t erase known ones
  const merged = { ...session.fields };
  if (llmJson.fields?.reason) merged.reason = llmJson.fields.reason;
  if (llmJson.fields?.clockin) merged.clockin = llmJson.fields.clockin;
  if (llmJson.fields?.clockout) merged.clockout = llmJson.fields.clockout;


  // Handle times: normalize to UTC ISO format (YYYY-MM-DDTHH:mm:ss.000Z)
  const date = merged.date;
  let clockinISO = merged.clockin;
  let clockoutISO = merged.clockout;

  // Normalize to UTC ISO string if present, handling timezone offsets and Asia/Dubai
  if (clockinISO) {
    let d = dayjs(clockinISO);
    if (!d.isValid()) {
      d = dayjs.tz(clockinISO, "Asia/Dubai");
    }
    if (d.isValid()) {
      clockinISO = d.utc().format('YYYY-MM-DDTHH:mm:ss.000[Z]');
    }
  }
  if (clockoutISO) {
    let d = dayjs(clockoutISO);
    if (!d.isValid()) {
      d = dayjs.tz(clockoutISO, "Asia/Dubai");
    }
    if (d.isValid()) {
      clockoutISO = d.utc().format('YYYY-MM-DDTHH:mm:ss.000[Z]');
    }
  }

  merged.clockin = clockinISO || merged.clockin || null;
  merged.clockout = clockoutISO || merged.clockout || null;

  // 6) Compute missing
  const missing = [];
  if (!merged.clockin) missing.push("clockin");
  if (!merged.clockout) missing.push("clockout");
  if (!merged.reason) missing.push("reason");

  setSession(employeeId, { fields: merged, missing });

  if (missing.length) {
    // Ask only for what’s missing, naturally
    if (missing.length === 3) return "Please share your clock-in time, clock-out time, and the reason.";
    if (missing.length === 2) return `Please share your ${missing[0]} and ${missing[1]}.`;
    if (missing.length === 1) return `Please share your ${missing[0]}.`;
  }

  // 7) Validate and submit
  const { valid, msg } = validateFields({
    date,
    clockinISO: merged.clockin,
    clockoutISO: merged.clockout,
    reason: merged.reason,
  });
  if (!valid) return msg || "Some details look off. Please recheck your times.";
  console.log("All fields are valid.", merged);
  const submitUrl = `${baseUrl}/regularization/submit` +
    `?id=${encodeURIComponent(session.id)}` +
    `&firHalf=${encodeURIComponent(merged.clockin)}` +
    `&secHalf=${encodeURIComponent(merged.clockout)}` +
    `&Reason=${encodeURIComponent(merged.reason)}` +
    `&status=REGULARIZED`;
 console.log("Submitting regularization with URL*************", submitUrl);
  const headers = { Authorization: authHeader, CompanyId: companyId };
  const submitResponse = await axios.patch(submitUrl, {}, { headers });
  // reset session after success
  setSession(employeeId, { status: "submitted", fields: { date: null, clockin: null, clockout: null, reason: null }, missing: [], id: null });
  return `${submitResponse.data.message || "Your regularization was submitted successfully."} ✅`;
}
