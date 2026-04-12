import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { findOrCreateSocialUser, findUserById } from '../models/sql/user.model.js';

export const configureStrategies = () => {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:8080';

    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${serverUrl}/api/auth/social/google/callback`
        },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await findOrCreateSocialUser({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id
                    });
                    done(null, user);
                } catch (error) {
                    done(error, null);
                }
            }));
    }

    // Facebook OAuth Strategy
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        passport.use(new FacebookStrategy({
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: `${serverUrl}/api/auth/social/facebook/callback`,
            profileFields: ['id', 'displayName', 'emails']
        },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await findOrCreateSocialUser({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        facebookId: profile.id
                    });
                    done(null, user);
                } catch (error) {
                    done(error, null);
                }
            }));
    }
};

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
