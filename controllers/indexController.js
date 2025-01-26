const { validationResult, body } = require("express-validator");
const { hashPassword } = require("../helper/bcryptHash");
const {
  userMethods,
  postMethods,
  commentMethods,
  roomMethods,
} = require("../db/db_utilities");
const passport = require("passport");
const {
  groupsComments,
  findAncestralParents,
  findReplies,
} = require("../public/js/groupComments");

const getHomePage = async (req, res) => {
  const selectedTab = req.query.selectedTab;

  console.log("selectedTab", selectedTab);
  try {
    let posts = await postMethods.getPosts();
    let rooms = await roomMethods.getRooms();
    let allRoomMembers = await roomMethods.getAllRoomMembers();

    rooms.forEach((room) => {
      room.members = allRoomMembers.filter(
        (member) => member.room_id === room.id
      );
    });

    // filter rooms to only include rooms that the user is a member of
    const user = res.locals.currentUser;
    const userRooms = rooms.filter((room) =>
      room.members.some((member) => member.user_id === user.id)
    );

    res.render("index/homepage", { posts, selectedTab, userRooms });
  } catch (err) {
    req.flash(
      "error",
      err.message || "Something went wrong. Please try again."
    );
    return res.redirect("/");
  }
};

const getLoginPage = (req, res) => {
  const message = res.locals.message;
  const error = res.locals.error;
  res.render("index/login", {
    message,
    error,
  });
};

const getRegisterPage = (req, res) => {
  const message = res.locals.message;
  const error = res.locals.error;
  res.render("index/register", {
    message,
    error,
  });
};

const postLoginPage = async (req, res, next) => {
  const errors = validationResult(req);

  // handle validation errors
  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect("/login");
  }

  // Use passport to authenticate user
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      req.flash("error", "Something went wrong. Please try again.");
      return res.redirect("/login");
    }
    if (!user) {
      req.flash("error", info.message || "Invalid username or password");
      return res.redirect("/login");
    }
    req.login(user, (err) => {
      if (err) {
        req.flash("error", "Something went wrong. Please try again.");
        return res.redirect("/login");
      }
      req.flash("success", "Login successful. Welcome back!");
      return res.redirect("/");
    });
  })(req, res, next);
};

const postLogoutPage = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logout successful. See you soon!");
    res.redirect("/login");
  });
};

const postRegisterPage = async (req, res, next) => {
  const { username, firstName, lastName, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect("/register");
  }
  let base64ProfilePicture = null;
  if (req.file) {
    base64ProfilePicture = req.file.buffer.toString("base64");
  }

  const hashedPassword = await hashPassword(password);

  try {
    await userMethods.insertUser(
      username.toLowerCase(),
      firstName.toLowerCase(),
      lastName.toLowerCase(),
      email.toLowerCase(),
      hashedPassword,
      base64ProfilePicture
    );
    req.flash("success", "Registration successful. Please login.");
    res.redirect("/login");
  } catch (err) {
    req.flash("error", "Registration failed. Please try again.");
    return res.redirect("/register");
  }
};

const getProfilePage = async (req, res) => {
  const username = req.params.username;
  const user = await userMethods.getUserByUsername(username);

  res.render("index/profile", { user });
};

const getCreatePostPage = (req, res) => {
  res.render("index/createPost");
};

const postCreatePostPage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect("/create-post");
  }
  let base64PostImage = null;
  if (req.file) {
    base64PostImage = req.file.buffer.toString("base64");
  }
  const { content } = req.body;
  const userId = req.user.id;

  try {
    await postMethods.insertPost(userId, content, base64PostImage);
    req.flash("success", "Post created successfully.");
    res.redirect("/");
  } catch (err) {
    req.flash("error", "Post creation failed. Please try again.");
    return res.redirect("/create-post");
  }
};

const getPostDetailPage = async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await postMethods.getPostById(postId);
    const comments = await commentMethods.getCommentsByPostId(postId);

    // group comments and their replies
    const { tree, commentMap } = groupsComments(comments);

    res.render("index/postDetail", { post, tree });
  } catch (err) {
    req.flash("error", err.message || "Post not found. Please try again.");
    return res.redirect("/");
  }
};

const postComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    console.log(errors.array()[0].msg);
    return res.redirect(`/post/${req.body.postId}`);
  }
  let { postId, parentCommentId, content } = req.body;
  const userId = req.user.id;

  if (parentCommentId === "null") {
    parentCommentId = null;
  }
  console.log("postId", postId);
  console.log("parentCommentId", parentCommentId);
  console.log("content", content);
  try {
    await commentMethods.insertComment(
      postId,
      userId,
      parentCommentId,
      content
    );
    console.log("Comment created successfully");
    res.redirect(`/post/${postId}`);
  } catch (err) {
    req.flash("error", "Comment creation failed. Please try again.");
    return res.redirect(`/post/${postId}`);
  }
};

const getReplyPage = async (req, res) => {
  if (!res.locals.currentUser) {
    return res.redirect("/login");
  }
  const commentId = req.params.commentId;
  const postId = req.params.postId;

  try {
    const post = await postMethods.getPostById(postId);
    const comments = await commentMethods.getCommentsByPostId(postId);
    const comment = comments.find(
      (comment) => comment.comment_id === commentId
    );
    const { tree, commentMap } = groupsComments(comments);
    const ancestorComments = findAncestralParents(commentMap, commentId);
    const replies = findReplies(commentMap, commentId);
    console.log("ancestorComments", ancestorComments);
    console.log("comment", comment);
    console.log("replies", replies);
    res.render("index/reply", {
      post,
      ancestorComments,
      comment,
      replies,
      tree,
    });
  } catch (err) {
    req.flash("error", err.message || "Comment not found. Please try again.");
    return res.redirect(`/post/${postId}`);
  }
};

const postReply = async (req, res) => {
  if (!res.locals.currentUser) {
    return res.redirect("/login");
  }
  const commentId = req.params.commentId;
  const postId = req.params.postId;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect(`/post/${postId}/reply/${commentId}`);
  }
  const userId = req.user.id;
  const { content } = req.body;
  try {
    await commentMethods.insertComment(postId, userId, commentId, content);
    req.flash("success", "Reply created successfully.");
    res.redirect(`/post/${postId}/reply/${commentId}`);
  } catch (err) {
    req.flash("error", "Comment creation failed. Please try again.");
    return res.redirect(`/post/${postId}/reply/${commentId}`);
  }
};

const getUsersPage = async (req, res) => {
  if (!res.locals.currentUser) {
    return res.redirect("/login");
  }
  if (res.locals.currentUser.role !== "superadmin") {
    return res.redirect("/");
  }

  const users = await userMethods.getUsers();
  res.render("index/allUsers", { users });
};

module.exports = {
  getHomePage,
  getLoginPage,
  getRegisterPage,
  postRegisterPage,
  postLoginPage,
  postLogoutPage,
  getProfilePage,
  getCreatePostPage,
  postCreatePostPage,
  getPostDetailPage,
  postComment,
  getReplyPage,
  postReply,
  getUsersPage,
};
