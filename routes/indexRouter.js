const indexController = require("../controllers/indexController");
const { Router } = require("express");
const indexRouter = Router();
const { body } = require("express-validator");
const upload = require("../helper/multerUploader");

const passport = require("passport");

const validateLogin = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
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
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
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

indexRouter.get("/create-post", indexController.getCreatePostPage);

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

// view all users
indexRouter.get("/users", indexController.getUsersPage);

module.exports = indexRouter;
