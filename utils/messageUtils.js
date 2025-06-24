function extractYear(msg) {
  const match = msg.match(/20\d{2}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

function extractLeaveType(msg) {
  const lower = msg.toLowerCase();
  const types = ["annual", "casual", "maternity", "paternity", "test", "halfday", "paid", "sick"];
  return types.find(type => lower.includes(type));
}

module.exports = { extractYear, extractLeaveType };
