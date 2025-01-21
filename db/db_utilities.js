const pool = require("./pool");
const timeAgo = require("../public/js/timeAgo.js");
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
  getPosts: async () => {
    try {
      // get all posts and the number of comments they have with user details and room name
      const query = `
        SELECT posts.*, users.username, users.firstname, users.lastname, users.profile_picture, rooms.name as room_name, COUNT(comments.id) as comment_count FROM posts 
        INNER JOIN users ON posts.user_id = users.id
        LEFT JOIN rooms ON posts.room_id = rooms.id
        LEFT JOIN comments ON posts.id = comments.post_id
        GROUP BY users.username, posts.id, rooms.name, users.firstname, users.lastname, users.profile_picture 
        ORDER BY posts.created_at DESC
        `;
      const result = await pool.query(query);
      await Promise.all(
        result.rows.map(async (post) => {
          post.time_ago = timeAgo(post.created_at);
          const comments = await commentMethods.getCommentsByPostId(post.id);
          const { tree } = groupsComments(comments);
          post.comment_count = Object.keys(tree).length;
        })
      );
      console.log(result.rows);

      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
  getPostById: async (id) => {
    try {
      const query = `
        SELECT posts.*, users.username, users.firstname, users.lastname, users.profile_picture, rooms.name as room_name FROM posts 
        INNER JOIN users ON posts.user_id = users.id
        LEFT JOIN rooms ON posts.room_id = rooms.id
        WHERE posts.id = $1
      `;
      const values = [id];
      const result = await pool.query(query, values);
      result.rows[0].time_ago = timeAgo(result.rows[0].created_at);
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
  getCommentsByPostId: async (postId) => {
    try {
      const query = `
        SELECT comments.id as comment_id, comments.parent_comment_id as parent_comment_id, comments.user_id as user_id, comments.content as content, comments.created_at as created_at, users.username as username, users.firstname as firstname, users.lastname as lastname, users.profile_picture as  profile_picture FROM comments 
        INNER JOIN users ON comments.user_id = users.id 
        WHERE comments.post_id = $1 
        ORDER BY comments.created_at ASC
      `;
      const values = [postId];
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
    const query = `
      SELECT comments.*, users.username, users.firstname, users.lastname, users.profile_picture FROM comments 
      INNER JOIN users ON comments.user_id = users.id 
      ORDER BY comments.created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  },
};

module.exports = { userMethods, postMethods, commentMethods };
