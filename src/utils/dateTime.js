const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const formatToJakartaDateTime = (value) => {
  if (!value) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
};

module.exports = {
  formatToJakartaDateTime,
  JAKARTA_TIME_ZONE
};
