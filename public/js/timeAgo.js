const { formatDistanceToNow } = require("date-fns");

const timeAgo = (date) => {
  return formatDistanceToNow(date, { addSuffix: true });
};

module.exports = timeAgo;
