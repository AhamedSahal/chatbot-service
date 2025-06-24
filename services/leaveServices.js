const axios = require("axios");
const { getOpenAIResponse } = require("./openaiServices");

function extractLeaveType(message) {
  const knownTypes = ["annual", "casual", "maternity", "paternity", "test", "halfday", "national", "sample", "paid", "sick", "unpaid"];
  const lower = message.toLowerCase();
  return knownTypes.find(type => lower.includes(type));
}

async function getLeaveBalanceReply(userMessage, employeeId, authHeader, companyId) {
  const year = new Date().getFullYear();
  const calendar = 0;
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  const url = `${baseUrl}/leave/balance?employeeId=${employeeId}&year=${year}&calendar=${calendar}`;

  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
  }

  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
  };

  const response = await axios.get(url, { headers });
  const details = response.data?.data?.details;
  if (!Array.isArray(details)) return "Could not find your leave balance.";

  const leaveType = extractLeaveType(userMessage);
  if (leaveType) {
    const match = details.find(d => d.leaveType?.name?.toLowerCase().includes(leaveType));
    if (match) {
      const prompt = `Generate a polite message: ${match.leaveType.name} leave balance is ${match.leaveBalance} days for ${year}`;
      return await getOpenAIResponse(prompt);
    } else {
      return `No matching leave type found for "${leaveType}".`;
    }
  } else {
    const list = details.map(d => `- ${d.leaveType?.name || "Unknown"}: ${parseFloat(d.leaveBalance).toFixed(2)} days`).join("\n");
    return `Here are your leave balances for ${year}:

${list}`;
  }
}

module.exports = {
  getLeaveBalanceReply,
};