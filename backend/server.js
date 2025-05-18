
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const movieRoutes = require('./routes/movies');
const adminRoutes = require('./routes/admin');
const config = require('./config/config');

const app = express();

// MongoDB Connection
mongoose.connect(config.mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['https://movie-downloader-new.onrender.com', 'https://t.me']
}));
app.use(express.json());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per IP
}));
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api', movieRoutes);
app.use('/api/admin', adminRoutes);

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Serve Admin Panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'admin.html'));
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
