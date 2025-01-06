const { validationResult, body } = require("express-validator");
const { hashPassword } = require("../helper/bcryptHash");
const { userMethods } = require("../db/db_utilities");

const validateRegister = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long."),
  body("firstName")
    .isLength({ min: 3 })
    .withMessage("First name must be at least 3 characters long."),
  body("lastName")
    .isLength({ min: 3 })
    .withMessage("Last name must be at least 3 characters long."),
  body("email").isEmail().withMessage("Email must be a valid email address."),
  body("profilePicture").optional(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
];

const validateLogin = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
];

const getHomePage = (req, res) => {
  res.render("index/homepage");
};

const getLoginPage = (req, res) => {
  console.log("flash: ", req.flash());
  res.render("index/login", {
    flash: req.flash("message"),
  });
};

const getRegisterPage = (req, res) => {
  res.render("index/register", {
    flash: req.flash("message"),
  });
};

const postLoginPage = async (req, res, next) => {
  const { username, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("message", errors.array()[0].msg);
    res.redirect("/login");
  }
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
};

const postLogoutPage = (req, res) => {
  req.logout();
  res.redirect("/login");
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
    res.redirect("/register");
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
