const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db/pool");
require("dotenv").config();
const passport = require("passport");
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
    store: new pgSession({ pool }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    store: new pgSession({ pool, createTableIfMissing: true }),
  })
);

// use passport middleware
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.flash = req.flash();
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

const indexRouter = require("./routes/indexRouter");

// use routes
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handling middleware
app.use((err, req, res, next) => {
  //set locals, only providing err in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") == "development" ? err : {};

  console.error(err.stack);
  res.status(500).send(err.message || "Something broke!");
});

// start server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
