const indexController = require("../controllers/indexController");

const { Router } = require("express");
const indexRouter = Router();

indexRouter.get("/", indexController.getHomePage);
indexRouter.get("/login", indexController.getLoginPage);
indexRouter.get("/register", indexController.getRegisterPage);

module.exports = indexRouter;
