const indexController = require("../controllers/indexController");
const { Router } = require("express");
const indexRouter = Router();
const { body } = require("express-validator");
const multer = require("multer");
const passport = require("passport");

const storage = multer.memoryStorage({
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload a valid image file"));
    }
  },
});

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

indexRouter.get("/profile", indexController.getProfilePage);

indexRouter.get("/create-post", indexController.getCreatePostPage);

indexRouter.post(
  "/create-post",
  upload.single("postImage"),
  validateCreatePost,
  indexController.postCreatePostPage
);

module.exports = indexRouter;
