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
