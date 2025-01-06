const { validationResult, body } = require("express-validator");
const { hashPassword } = require("../helper/bcryptHash");
const { userMethods } = require("../db/db_utilities");
const passport = require("passport");

const getHomePage = (req, res) => {
  res.render("index/homepage");
};

const getLoginPage = (req, res) => {
  const message = req.flash("message");
  res.render("index/login", {
    message,
  });
};

const getRegisterPage = (req, res) => {
  const message = req.flash("message");
  res.render("index/register", {
    message,
  });
};

const postLoginPage = async (req, res, next) => {
  const errors = validationResult(req);

  // handle validation errors
  if (!errors.isEmpty()) {
    req.flash("message", errors.array()[0].msg);
    return res.redirect("/login");
  }

  // Use passport to authenticate user
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash("message", info.message || "Invalid username or password");
      return res.redirect("/login");
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/");
    });
  })(req, res, next);
};

const postLogoutPage = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
};

const postRegisterPage = async (req, res, next) => {
  const { username, firstName, lastName, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("message", errors.array()[0].msg);
    res.redirect("/register");
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
    req.flash("message", "Registration successful. Please login.");
    res.redirect("/login");
  } catch (err) {
    req.flash("message", "Registration failed. Please try again.");
    next(err);
  }
};

module.exports = {
  getHomePage,
  getLoginPage,
  getRegisterPage,
  postRegisterPage,
  postLoginPage,
  postLogoutPage,
};
