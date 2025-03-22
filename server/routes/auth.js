// server/routes/auth.js
const express = require('express');
const router = express.Router();

// Mock OIDC callback
router.get('/callback', (req, res) => {
    // In a real implementation, this would handle the OIDC callback
    // For mock purposes, we'll create a fake user session
    req.session.user = {
        id: '123',
        name: 'Test User',
        email: 'user@example.com',
        groups: ['employees', 'finance'] // User's groups from OIDC claims
    };

    res.redirect('/');
});

// Login route
router.get('/login', (req, res) => {
    // In a real implementation, redirect to OIDC provider
    // For mock purposes, we'll redirect to the callback
    res.redirect('/auth/callback');
});

// Logout route
router.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }

        // In a real implementation, you might also want to redirect to the OIDC provider's logout endpoint
        // For now, just redirect to the home page
        res.redirect('/');
    });
});

// Get current user
router.get('/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json(req.session.user);
});

module.exports = router;