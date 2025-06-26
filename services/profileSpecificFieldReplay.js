const axios = require("axios");
const { getOpenAIResponse } = require("./openaiServices");

async function getSpecificFieldReply(field, employeeId, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN;
  const personalUrl = `${baseUrl}/employee/personal-info?id=${employeeId}`;
  const companyUrl = `${baseUrl}/employee/company?id=${employeeId}`;

  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
    employeeId: employeeId,
  };

  try {
    const [profileRes, companyRes] = await Promise.all([
      axios.get(personalUrl, { headers }),
      axios.get(companyUrl, { headers }),
    ]);

    const profile = profileRes.data?.data || {};
    const company = companyRes.data?.data || {};
    const data = { ...profile, ...company };

    let value = "-";

    switch (field) {
      case "reportingManager":
        value = company?.reportingManager?.name || "Not assigned";
        break;
      case "employeeLanguages":
        value = profile?.employeeLanguages?.map(lang => lang.name).join(", ") || "-";
        break;
      case "jobTitle":
        value = company?.jobTitle?.name || profile?.jobTitle?.name || "-";
        break;
      case "grades":
        value = data[field]?.name || "Grade information is not available.";
        break;
      case "department":
      case "division":
      case "branch":
      case "function":
      case "section":
        value = data[field]?.name || "-";
        break;
      case "dob":
      case "doj":
        value = data[field]?.split("T")[0] || "-";
        break;
      default:
        value = data[field] || "-";
    }

    const formattedField = field.replace(/([A-Z])/g, " $1").toLowerCase();
    const prompt = `The ${formattedField} is "${value}". Please respond in a formal and polite tone, avoiding phrases like 'Based on the data' or 'The data shows'. Keep it direct and clear.`;

    return await getOpenAIResponse(prompt);
  } catch (err) {
    console.error("Error in getSpecificFieldReply:", err);
    return "Sorry, I couldn't retrieve your information at this time.";
  }
}

module.exports = {
  getSpecificFieldReply,
};
