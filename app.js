const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db/pool");
require("dotenv").config();
const passport = require("passport");
require("./strategies/LocalStrategy");
const flash = require("connect-flash");
const app = express();

// set view engine
app.set("view engine", "ejs");

// set views directory
app.set("views", path.join(__dirname, "views"));

// use express.json middleware
app.use(express.json());

// use express.urlencoded middleware
app.use(express.urlencoded({ extended: true }));

// use express.static middleware
app.use(express.static(path.join(__dirname, "public")));

// use session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    store: new pgSession({ pool, createTableIfMissing: true }),
  })
);

// use passport middleware
app.use(passport.initialize());
app.use(passport.session());

// use flash middleware
app.use(flash());

app.use((req, res, next) => {
  res.locals.flash = req.flash();
  next();
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  console.log("res.locals.currentUser: ", res.locals.currentUser);
  next();
});

const indexRouter = require("./routes/indexRouter");

// use routes
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).render("404", {
    error: {
      status: 404,
      message: "Page not found",
    },
  });
});

// error handling middleware
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  console.error(err.stack);
  res.status(err.status || 500);
  res.render("error", { error: res.locals.error });
});

// start server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
