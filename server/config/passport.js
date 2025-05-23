const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const authService = require('../services/authServices');

// Helper function to determine callback URL
const getGoogleCallbackUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOOGLE_CALLBACK_URL || 'https://api.raeesmalls.com/api/auth/google/callback';
  }
  return process.env.GOOGLE_CALLBACK_URL_DEV || 'http://localhost:5000/api/auth/google/callback';
};

module.exports = function (passport) {
  // Local Strategy (unchanged)
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

          if (user.provider !== 'local') {
            console.log('User is not local provider:', email);
            return done(null, false, { message: 'Please use Google to log in' });
          }

          console.log('Stored password hash:', user.password);
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            console.log('Password mismatch for email:', email);
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

  // Google Strategy with improved callback URL handling
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(),
        proxy: true, // Important for production behind proxy
        passReqToCallback: true // Optional: if you need access to req object
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Find user by Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Check if email exists with different provider
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
              // Update existing user with Google ID
              user.googleId = profile.id;
              user.provider = 'google';
              user.isVerified = true;
              await user.save();
            } else {
              // Create new user
              user = await authService.createUser(
                profile.displayName,
                profile.emails[0].value,
                null, // No password for Google auth
                'user',
                'google',
                profile.id
              );
            }
          }

          console.log('Google user authenticated:', user.email, 'ID:', user._id);
          return done(null, user);
        } catch (err) {
          console.error('Google auth error:', err.message);
          return done(err);
        }
      }
    )
  );

  // Serialization (unchanged)
  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user._id.toString());
    done(null, user._id.toString());
  });

  // Deserialization with caching (unchanged)
  const userCache = new Map();

  passport.deserializeUser(async (id, done) => {
    try {
      if (userCache.has(id)) {
        console.log('Returning cached user for ID:', id);
        return done(null, userCache.get(id));
      }

      const user = await User.findById(id).select('-password');
      if (!user) {
        console.log('User not found for ID:', id);
        return done(null, false);
      }

      userCache.set(id, user);
      setTimeout(() => userCache.delete(id), 300000);

      console.log('Deserialized and cached user:', user.email);
      done(null, user);
    } catch (err) {
      console.error('Deserialize error:', err.message);
      done(err);
    }
  });
};