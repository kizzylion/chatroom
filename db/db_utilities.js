const pool = require("./pool");
const timeAgo = require("../public/js/timeAgo.js");
const { format } = require("date-fns");
const { groupsComments } = require("../public/js/groupComments");

const userMethods = {
  insertUser: async (
    username,
    firstName,
    lastName,
    email,
    password_hash,
    profile_picture
  ) => {
    try {
      const query =
        "INSERT INTO users (username, firstName, lastName, email, password_hash, profile_picture) VALUES ($1, $2, $3, $4, $5, $6)";
      const values = [
        username,
        firstName,
        lastName,
        email,
        password_hash,
        profile_picture,
      ];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  getUserByUsername: async (username) => {
    try {
      const query = "SELECT * FROM users WHERE username = $1";
      const values = [username];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  getUserById: async (id) => {
    try {
      const query = "SELECT * FROM users WHERE id = $1";
      const values = [id];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  // get all users in the database with their total number of posts and rooms they are in.
  getUsers: async () => {
    try {
      const query = `
        SELECT 
          users.*, 
          COUNT(posts.id) AS post_count, 
          COUNT(DISTINCT RoomMembers.room_id) AS room_count,
          COUNT(DISTINCT rooms.id) AS room_created_count
        FROM users
        LEFT JOIN posts ON users.id = posts.user_id AND posts.room_id IS NULL
        LEFT JOIN RoomMembers ON users.id = RoomMembers.user_id
        LEFT JOIN rooms ON users.id = rooms.created_by
        GROUP BY users.id
        ORDER BY users.created_at ASC;
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  updateUser: async (
    userId,
    firstName,
    lastName,
    email,
    bio,
    profile_picture
  ) => {
    try {
      const query = `UPDATE users SET firstName = $2, lastName = $3, email = $4, bio = $5, profile_picture = $6 WHERE id = $1`;
      const values = [userId, firstName, lastName, email, bio, profile_picture];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  updateUserPassword: async (userId, password_hash) => {
    try {
      const query = `UPDATE users SET password_hash = $2 WHERE id = $1`;
      const values = [userId, password_hash];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
};

const postMethods = {
  insertPost: async (userId, content, post_picture) => {
    try {
      const query =
        "INSERT INTO posts (user_id, content, post_picture) VALUES ($1, $2, $3)";
      const values = [userId, content, post_picture];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  getPosts: async (userId) => {
    try {
      // Query to fetch posts with their related data
      const query = `
        SELECT 
          posts.*, 
          users.username, 
          users.firstname, 
          users.lastname, 
          users.profile_picture, 
          rooms.name AS room_name, 
          COUNT(DISTINCT comments.id) AS comment_count, 
          COUNT(DISTINCT Reactions.id) AS reaction_count,
          ReactionTypes.name AS reaction_type_name,
          ReactionTypes.icon AS reaction_type_icon,
          UserReactions.name AS user_reaction_type_name,
          UserReactions.icon AS user_reaction_type_icon
        FROM posts
        INNER JOIN users ON posts.user_id = users.id
        LEFT JOIN rooms ON posts.room_id = rooms.id
        LEFT JOIN comments ON posts.id = comments.post_id
        LEFT JOIN Reactions ON posts.id = Reactions.post_id
        LEFT JOIN ReactionTypes ON Reactions.reaction_type_id = ReactionTypes.id
        LEFT JOIN (
          SELECT 
            Reactions.post_id, 
            ReactionTypes.name, 
            ReactionTypes.icon
          FROM Reactions
          JOIN ReactionTypes ON Reactions.reaction_type_id = ReactionTypes.id
          WHERE Reactions.user_id = $1
        ) AS UserReactions ON posts.id = UserReactions.post_id
        GROUP BY 
          posts.id, 
          users.username, 
          users.firstname, 
          users.lastname, 
          users.profile_picture, 
          rooms.name, 
          ReactionTypes.name, 
          ReactionTypes.icon, 
          UserReactions.name, 
          UserReactions.icon
        ORDER BY posts.created_at DESC
      `;

      const values = [userId];
      const result = await pool.query(query, values);

      // Process each post to add time ago and a comment tree
      await Promise.all(
        result.rows.map(async (post) => {
          // Add 'time_ago' property
          post.time_ago = timeAgo(post.created_at);

          // Fetch comments and group them into a tree structure
          const comments = await commentMethods.getCommentsByPostId(
            post.id,
            userId
          );
          const { tree } = groupsComments(comments);
          post.comment_count = Object.keys(tree).length; // Update comment count with the grouped tree size
        })
      );

      console.log(result.rows); // Log result for debugging
      return result.rows;
    } catch (error) {
      console.error("Error fetching posts:", error.message);
      throw new Error("Unable to fetch posts.");
    }
  },
  getPostById: async (id, userId) => {
    try {
      const query = `
        SELECT 
          posts.*, 
          users.username, users.firstname, users.lastname, users.profile_picture, 
          rooms.name as room_name, 
          COUNT(DISTINCT comments.id) as comment_count, 
          COUNT(DISTINCT Reactions.id) as reaction_count,
          ReactionTypes.name as reaction_type_name,
          ReactionTypes.icon as reaction_type_icon,
          UserReactions.name as user_reaction_type_name,
          UserReactions.icon as user_reaction_type_icon
        FROM posts 
        INNER JOIN users ON posts.user_id = users.id
        LEFT JOIN rooms ON posts.room_id = rooms.id
        LEFT JOIN comments ON posts.id = comments.post_id
        LEFT JOIN Reactions ON posts.id = Reactions.post_id
        LEFT JOIN ReactionTypes ON Reactions.reaction_type_id = ReactionTypes.id
        LEFT JOIN (
          SELECT Reactions.post_id, ReactionTypes.name, ReactionTypes.icon
          FROM Reactions
          JOIN ReactionTypes ON Reactions.reaction_type_id = ReactionTypes.id
          WHERE Reactions.user_id = $2
        ) AS UserReactions ON posts.id = UserReactions.post_id
        WHERE posts.id = $1
        GROUP BY posts.id, users.username, users.firstname, users.lastname, users.profile_picture, rooms.name, ReactionTypes.name, ReactionTypes.icon, UserReactions.name, UserReactions.icon
      `;
      const values = [id, userId];
      const result = await pool.query(query, values);
      result.rows[0].time_ago = timeAgo(result.rows[0].created_at);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  insertReaction: async (postId, userId, reaction_type_id) => {
    try {
      const query = `INSERT INTO Reactions (post_id, user_id, reaction_type_id) VALUES ($1, $2, $3)`;
      const values = [postId, userId, reaction_type_id];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  deleteReaction: async (postId, userId) => {
    try {
      const query = `DELETE FROM Reactions WHERE post_id = $1 AND user_id = $2`;
      const values = [postId, userId];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  getReactionTypeByName: async (name) => {
    try {
      const query = `SELECT * FROM ReactionTypes WHERE name = $1`;
      const values = [name];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
};

const commentMethods = {
  insertComment: async (postId, userId, parentCommentId, content) => {
    try {
      const query =
        "INSERT INTO comments (post_id, user_id, parent_comment_id, content) VALUES ($1, $2, $3, $4) RETURNING *";
      const values = [postId, userId, parentCommentId || null, content];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  getCommentsByPostId: async (postId, userId) => {
    try {
      const query = `
        SELECT comments.id as comment_id, 
        comments.parent_comment_id as parent_comment_id, 
        comments.user_id as user_id, 
        comments.content as content, 
        comments.created_at as created_at, 
        users.username as username, 
        users.firstname as firstname, 
        users.lastname as lastname, 
        users.profile_picture as  profile_picture,
        ReactionTypes.name as reaction_type_name,
        ReactionTypes.icon as reaction_type_icon,
        COUNT(CommentReactions.id) as reaction_count,
        UserReactions.name as user_reaction_type_name,
        UserReactions.icon as user_reaction_type_icon
        FROM comments 
        INNER JOIN users ON comments.user_id = users.id 
        LEFT JOIN CommentReactions ON comments.id = CommentReactions.comment_id
        LEFT JOIN ReactionTypes ON CommentReactions.reaction_type_id = ReactionTypes.id
        LEFT JOIN (
          SELECT CommentReactions.comment_id, ReactionTypes.name, ReactionTypes.icon
          FROM CommentReactions
          JOIN ReactionTypes ON CommentReactions.reaction_type_id = ReactionTypes.id
          WHERE CommentReactions.user_id = $2
        ) AS UserReactions ON comments.id = UserReactions.comment_id
        WHERE comments.post_id = $1 
        GROUP BY comments.id, users.username, users.firstname, users.lastname, users.profile_picture, ReactionTypes.name, ReactionTypes.icon, UserReactions.name, UserReactions.icon
        ORDER BY comments.created_at ASC
      `;
      const values = [postId, userId];
      const result = await pool.query(query, values);
      result.rows.forEach((comment) => {
        comment.time_ago = timeAgo(comment.created_at);
      });
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  getCommentById: async (id) => {
    try {
      const query = `
        SELECT comments.id as comment_id, comments.parent_comment_id as parent_comment_id, comments.user_id as user_id, comments.content as content, comments.created_at as created_at, users.username as username, users.firstname as firstname, users.lastname as lastname, users.profile_picture as  profile_picture FROM comments 
        INNER JOIN users ON comments.user_id = users.id 
        WHERE comments.id = $1
      `;
      const values = [id];
      const result = await pool.query(query, values);
      result.rows[0].time_ago = timeAgo(result.rows[0].created_at);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  getComments: async () => {
    try {
      const query = `
        SELECT comments.*, users.username, users.firstname, users.lastname, users.profile_picture FROM comments 
        INNER JOIN users ON comments.user_id = users.id 
        ORDER BY comments.created_at ASC
    `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  insertCommentReaction: async (commentId, userId, reaction_type_id) => {
    try {
      const query = `INSERT INTO CommentReactions (comment_id, user_id, reaction_type_id) VALUES ($1, $2, $3)`;
      const values = [commentId, userId, reaction_type_id];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  deleteCommentReaction: async (commentId, userId) => {
    try {
      const query = `DELETE FROM CommentReactions WHERE comment_id = $1 AND user_id = $2`;
      const values = [commentId, userId];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
};

const roomMethods = {
  getRooms: async () => {
    try {
      const query = `SELECT rooms.*, RoomTypes.name as room_type_name FROM rooms JOIN RoomTypes ON rooms.room_type_id = RoomTypes.id`;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  getRoomTypes: async () => {
    const query = `SELECT * FROM RoomTypes`;
    const result = await pool.query(query);
    return result.rows;
  },
  getRoomTypeById: async (id) => {
    const query = `SELECT * FROM RoomTypes WHERE id = $1`;
    const values = [id];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },
  insertRoom: async (
    roomName,
    roomType,
    roomPicture,
    roomDescription,
    userId
  ) => {
    try {
      const query = `INSERT INTO rooms (name, room_type_id, room_picture, description, created_by) VALUES ($1, $2, $3, $4, $5)`;
      const values = [roomName, roomType, roomPicture, roomDescription, userId];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  getRoomByName: async (roomName) => {
    try {
      const query = `SELECT * FROM rooms WHERE name = $1`;
      const values = [roomName];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  insertRoomMember: async (roomId, userId, role) => {
    try {
      const query = `INSERT INTO RoomMembers (room_id, user_id, role) VALUES ($1, $2, $3)`;
      const values = [roomId, userId, role];
      await pool.query(query, values);
      return { message: "You have joined the room successfully." };
    } catch (error) {
      console.error(error);
      return { message: "Something went wrong. Please try again." };
    }
  },
  getAllRoomMembers: async () => {
    try {
      const query = `SELECT RoomMembers.*, users.username, users.firstname, users.lastname, users.profile_picture FROM RoomMembers JOIN users ON RoomMembers.user_id = users.id`;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  getRoomMembers: async (roomId) => {
    try {
      const query = `SELECT RoomMembers.*, users.username, users.firstname, users.lastname, users.profile_picture FROM RoomMembers JOIN users ON RoomMembers.user_id = users.id WHERE room_id = $1`;
      const values = [roomId];
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  deleteRoomMember: async (roomId, userId) => {
    try {
      const query = `DELETE FROM RoomMembers WHERE room_id = $1 AND user_id = $2`;
      const values = [roomId, userId];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  getRoomById: async (id) => {
    try {
      const query = `SELECT * FROM rooms WHERE id = $1`;
      const values = [id];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(error);
    }
  },
  insertPost: async (roomId, userId, content, postPicture) => {
    try {
      const query = `INSERT INTO posts (room_id, user_id, content, post_picture) VALUES ($1, $2, $3, $4)`;
      const values = [roomId, userId, content, postPicture];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
  getPostsByRoomId: async (roomId) => {
    try {
      const query = `SELECT posts.*, users.username, users.firstname, users.lastname, users.profile_picture FROM posts JOIN users ON posts.user_id = users.id WHERE posts.room_id = $1 ORDER BY posts.created_at ASC`;
      const values = [roomId];
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  deleteMessage: async (id) => {
    try {
      const query = `DELETE FROM posts WHERE id = $1`;
      const values = [id];
      await pool.query(query, values);
    } catch (error) {
      console.error(error);
    }
  },
};

module.exports = { userMethods, postMethods, commentMethods, roomMethods };
