// const groupComments = (comments) => {
//   return comments.reduce((acc, comment) => {
//     if (!comment.parent_comment_id) {
//       acc[comment.comment_id] = { ...comment, replies: [] };
//     } else {
//       if (!acc[comment.parent_comment_id]) {
//         // check if its a reply to a reply
//         const parentComment = comments.find(
//           (c) => c.comment_id === comment.parent_comment_id
//         );
//         if (parentComment.parent_comment_id) {
//           acc[parentComment.parent_comment_id].replies.push(comment);
//         } else {
//           acc[comment.parent_comment_id].replies.push({
//             ...comment,
//             replies: [],
//           });
//         }
//       }
//     }
//     return acc;
//   }, {});
// };

const groupsComments = (comments) => {
  const commentMap = new Map();
  const result = {};

  // Step 1: Store all comments in a map
  comments.forEach((comment) => {
    commentMap.set(comment.comment_id, { ...comment, replies: [] });
  });

  // console.log("commentMap", commentMap);

  // Step 2: Build the tree structure
  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      // Find the parent in the map and add this comment to its replies
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentMap.get(comment.comment_id));
      }
    } else {
      // If no parent, it's a top-level comment
      result[comment.comment_id] = commentMap.get(comment.comment_id);
    }
  });

  // console.log("result", result);

  return { tree: result, commentMap: commentMap };
};

const findParent = (commentMap, commentId) => {
  const comment = commentMap.get(commentId);
  return comment ? commentMap.get(comment.parent_comment_id) : null;
};

// Find all ancestral parents of a comment
const findAncestralParents = (commentMap, commentId) => {
  const ancestors = [];
  let current = commentMap.get(commentId);

  while (current && current.parent_comment_id) {
    current = commentMap.get(current.parent_comment_id);
    if (current) ancestors.push(current);
  }

  return ancestors;
};

// Find all replies to a specific comment
const findReplies = (commentMap, commentId) => {
  const comment = commentMap.get(commentId);
  return comment ? comment.replies : [];
};

module.exports = {
  findParent,
  findAncestralParents,
  findReplies,
  groupsComments,
};

// Example Usage
const comments = [
  { comment_id: 1, parent_comment_id: null, text: "Top level 1" },
  { comment_id: 2, parent_comment_id: null, text: "Top level 2" },
  { comment_id: 3, parent_comment_id: 1, text: "Reply to 1" },
  { comment_id: 4, parent_comment_id: 3, text: "Reply to Reply 1" },
  { comment_id: 5, parent_comment_id: 1, text: "Another reply to 1" },
];

// const { tree, commentMap } = groupComments(comments);

// // Find parent of comment 4
// const parent = findParent(commentMap, 4);
// console.log("Parent of comment 4:", parent);

// // Find ancestral parents of comment 4
// const ancestors = findAncestralParents(commentMap, 4);
// console.log("Ancestral parents of comment 4:", ancestors);

// // Find replies of comment 1
// const replies = findReplies(commentMap, 1);
// console.log("Replies of comment 1:", replies);
