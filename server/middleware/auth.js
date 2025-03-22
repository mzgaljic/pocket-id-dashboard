// server/middleware/auth.js
const auth = (req, res, next) => {
    // In a real implementation, validate the user's session
    // For mock purposes, we'll create a fake user
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = req.session.user;
    next();
};

module.exports = { auth };