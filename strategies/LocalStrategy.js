const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { comparePassword } = require("../helper/bcryptHash");
const { userMethods } = require("../db/db_utilities");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userMethods.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new LocalStrategy(
    { usernameField: "username" },
    async (username, password, done) => {
      try {
        const user = await userMethods.getUserByUsername(
          username.toLowerCase()
        );
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
          return done(null, false, { message: "Invalid password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
