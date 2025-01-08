import { formatDistanceToNow } from "date-fns";

export const timeAgo = (date) => {
  return formatDistanceToNow(date, { addSuffix: true });
};
