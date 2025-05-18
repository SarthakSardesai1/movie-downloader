const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const Movie = require('../models/movie');
const config = require('../config/config');

const router = express.Router();

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        jwt.verify(token, config.jwtSecret);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Login Route
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { username, password } = req.body;
    if (username !== config.adminUsername || !(await bcrypt.compare(password, config.adminPassword))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username }, config.jwtSecret, { expiresIn: '1h' });
    res.json({ token });
});

// Protect all admin routes
router.use(authenticate);

// GET all movies
router.get('/movies', async (req, res) => {
    try {
        const movies = await Movie.find();
        res.json(movies);
    } catch (error) {
        console.error('Error fetching movies list:', error.message);
        res.status(500).json({ error: 'Server error while fetching movies list' });
    }
});

// ADD a new movie
router.post('/movies', [
    body('imdbID').matches(/^tt\d+$/).withMessage('Invalid IMDb ID'),
    body('title').notEmpty().withMessage('Title is required'),
    body('downloadUrl').isURL().withMessage('Invalid download URL')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { imdbID, title, year, downloadUrl } = req.body;
        const existingMovie = await Movie.findOne({ imdbID });
        if (existingMovie) {
            return res.status(400).json({ error: 'Movie already exists in database' });
        }
        const newMovie = new Movie({
            id: new mongoose.Types.ObjectId().toString(),
            imdbID,
            title,
            year: year || '',
            downloadUrl
        });
        await newMovie.save();
        res.status(201).json(newMovie);
    } catch (error) {
        console.error('Error adding movie:', error.message);
        res.status(500).json({ error: 'Server error while adding movie' });
    }
});

// UPDATE a movie
router.put('/movies/:id', [
    param('id').isMongoId().withMessage('Invalid movie ID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('downloadUrl').optional().isURL().withMessage('Invalid download URL')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { id } = req.params;
        const { title, year, downloadUrl } = req.body;
        const movie = await Movie.findById(id);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        movie.title = title || movie.title;
        movie.year = year || movie.year;
        movie.downloadUrl = downloadUrl || movie.downloadUrl;
        await movie.save();
        res.json(movie);
    } catch (error) {
        console.error('Error updating movie:', error.message);
        res.status(500).json({ error: 'Server error while updating movie' });
    }
});

// DELETE a movie
router.delete('/movies/:id', [
    param('id').isMongoId().withMessage('Invalid movie ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { id } = req.params;
        const movie = await Movie.findByIdAndDelete(id);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        res.json({ message: 'Movie deleted successfully' });
    } catch (error) {
        console.error('Error deleting movie:', error.message);
        res.status(500).json({ error: 'Server error while deleting movie' });
    }
});

module.exports = router;
