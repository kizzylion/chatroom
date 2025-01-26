const indexController = require("../controllers/indexController");
const { Router } = require("express");
const indexRouter = Router();
const { body } = require("express-validator");
const upload = require("../helper/multerUploader");
const pool = require("../db/pool");
const passport = require("passport");
const { comparePassword } = require("../helper/bcryptHash");

const validateLogin = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long."),
  body("password")
    .isLength({ min: 4 })
    .withMessage("Password must be at least 4 characters long."),
];

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
    .isLength({ min: 4 })
    .withMessage("Password must be at least 4 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
];

const validateChangePassword = [
  body("currentPassword")
    .isLength({ min: 4 })
    .withMessage("Current password must be at least 4 characters long."),
  body("newPassword")
    .isLength({ min: 4 })
    .withMessage("New password must be at least 4 characters long."),
];

const validateComment = [
  body("content").isLength({ min: 1 }).withMessage("Content is required."),
];

const validateCreatePost = [
  body("content").isLength({ min: 1 }).withMessage("Content is required."),
  body("image").optional(),
];

indexRouter.get("/", indexController.getHomePage);
indexRouter.get("/login", indexController.getLoginPage);
indexRouter.get("/register", indexController.getRegisterPage);

indexRouter.post(
  "/register",
  upload.single("profilePicture"),
  validateRegister,
  indexController.postRegisterPage
);

indexRouter.post("/login", validateLogin, indexController.postLoginPage);

indexRouter.get("/logout", indexController.postLogoutPage);

indexRouter.get("/profile/:username", indexController.getProfilePage);

indexRouter.get("/profile/:username/edit", indexController.getEditProfilePage);

indexRouter.post(
  "/profile/:username/edit",
  upload.single("profilePicture"),
  indexController.postEditProfilePage
);

indexRouter.get(
  "/profile/:username/edit/changepassword",
  indexController.getChangePasswordPage
);
const validateCurrentPassword = async (req, res, next) => {
  const username = req.params.username;
  const { currentPassword } = req.body;

  try {
    // Query the database to get the user details
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE username = $1",
      [username]
    );

    // If user not found
    if (result.rows.length === 0) {
      req.flash("error", "User not found");
      return res.redirect(`/profile/${username}/edit/changepassword`);
    }

    const isPasswordCorrect = await comparePassword(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!isPasswordCorrect) {
      req.flash("error", "Current password is incorrect");
      return res.redirect(`/profile/${username}/edit/changepassword`);
    }
    console.log("isPasswordCorrect", isPasswordCorrect);

    next(); // Proceed to the next middleware or controller
  } catch (error) {
    console.error(error);
    req.flash("error", "An error occurred while verifying the password");
    return res.redirect(`/profile/${username}/edit/changepassword`);
  }
};

indexRouter.post(
  "/profile/:username/edit/changepassword",

  // verify that the current password matches the user's password
  validateCurrentPassword,
  validateChangePassword,
  indexController.postChangePasswordPage
);

indexRouter.get("/create-post", indexController.getCreatePostPage);

indexRouter.get("/post/:id/reaction", indexController.postReaction);
indexRouter.get(
  "/post/:id/detail/reaction",
  indexController.postDetailReaction
);
indexRouter.get(
  "/post/:id/comment/:commentId/reaction",
  indexController.postCommentReaction
);
indexRouter.get("/post/:id", indexController.getPostDetailPage);
indexRouter.post(
  "/create-post",
  upload.single("postImage"),
  validateCreatePost,
  indexController.postCreatePostPage
);

indexRouter.post("/post/:id", validateComment, indexController.postComment);

indexRouter.get("/post/:postId/reply/:commentId", indexController.getReplyPage);

indexRouter.post("/post/:postId/reply/:commentId", indexController.postReply);

indexRouter.get(
  "/post/:postId/reply/:commentId/reaction",
  indexController.postReplyReaction
);
// view all users
indexRouter.get("/users", indexController.getUsersPage);

module.exports = indexRouter;
