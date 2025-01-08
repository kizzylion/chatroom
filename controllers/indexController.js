const { validationResult, body } = require("express-validator");
const { hashPassword } = require("../helper/bcryptHash");
const { userMethods, postMethods } = require("../db/db_utilities");
const passport = require("passport");

const getHomePage = async (req, res) => {
  const posts = await postMethods.getPosts();
  res.render("index/homepage", { posts });
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

const getProfilePage = (req, res) => {
  res.render("index/profile");
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
};
