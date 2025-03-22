// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { auth } = require('./middleware/auth');
const appRoutes = require('./routes/apps');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://your-production-domain.com'
        : 'http://localhost:8080', // Vue dev server URL
    credentials: true // Important for cookies/sessions
}));

app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// API routes
app.use('/api/apps', auth, appRoutes);

// Auth routes
app.use('/auth', require('./routes/auth'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});