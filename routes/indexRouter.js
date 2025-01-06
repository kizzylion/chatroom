const indexController = require("../controllers/indexController");

const { Router } = require("express");
const indexRouter = Router();

const multer = require("multer");

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

indexRouter.get("/", indexController.getHomePage);
indexRouter.get("/login", indexController.getLoginPage);
indexRouter.get("/register", indexController.getRegisterPage);
indexRouter.post(
  "/register",
  upload.single("profilePicture"),
  indexController.postRegisterPage
);

indexRouter.post("/login", indexController.postLoginPage);
indexRouter.get("/logout", indexController.postLogoutPage);

module.exports = indexRouter;
