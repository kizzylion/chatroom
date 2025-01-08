const pool = require("./pool");
const { timeAgo } = require("../public/js/timeAgo.js");

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
      const query = `
        SELECT posts.*, users.username, users.firstname, users.lastname, users.profile_picture, rooms.name as room_name FROM posts 
        INNER JOIN users ON posts.user_id = users.id
        LEFT JOIN rooms ON posts.room_id = rooms.id
        ORDER BY posts.created_at DESC
        `;
      const result = await pool.query(query);
      console.log(result.rows);
      result.rows.forEach((post) => {
        post.created_at = timeAgo(post.created_at);
      });

      return result.rows;
    } catch (error) {
      console.error(error);
    }
  },
};

module.exports = { userMethods, postMethods };
