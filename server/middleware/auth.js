// server/middleware/auth.js
const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if token is expired
    if (req.session.tokenExpiry && new Date() > new Date(req.session.tokenExpiry)) {
        // Token expired, clear the session
        req.session.destroy((err) => {
            if (err) console.error('Error destroying session:', err);
            return res.status(401).json({ error: 'Session expired' });
        });
        return;
    }

    req.user = req.session.user;
    next();
};

module.exports = { auth };