const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
      },
      async (email, password, done) => {
        try {
          console.log('Passport verifying email:', email);
          const user = await User.findOne({ email });
          if (!user) {
            console.log('User not found for email:', email);
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log('Stored password hash:', user.password);
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            console.log('Password mismatch for email:', email, 'Input password:', password);
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log('User authenticated:', user.email, 'Role:', user.role);
          return done(null, user);
        } catch (err) {
          console.error('Passport error:', err.message);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        console.log('User not found for ID:', id);
        return done(null, false);
      }
      console.log('Deserialized user:', user.email);
      done(null, user);
    } catch (err) {
      console.error('Deserialize error:', err.message);
      done(err);
    }
  });
};