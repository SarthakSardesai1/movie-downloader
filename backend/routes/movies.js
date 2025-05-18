const express = require('express');
const axios = require('axios');
const { body, param, query, validationResult } = require('express-validator');
const Movie = require('../models/movie');
const config = require('../config/config');

const router = express.Router();

// Search movies from OMDb API
router.get('/search', [
    query('title').trim().notEmpty().withMessage('Movie title is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { title } = req.query;
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(title)}`);
        if (response.data.Response === 'False') {
            return res.status(404).json({ error: response.data.Error || 'Movies not found' });
        }
        res.json(response.data);
    } catch (error) {
        console.error('Error searching movies:', error.message);
        res.status(500).json({ error: 'Server error while searching movies' });
    }
});

// Get movie details from OMDb API
router.get('/movie/:imdbID', [
    param('imdbID').matches(/^tt\d+$/).withMessage('Invalid IMDb ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { imdbID } = req.params;
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&i=${imdbID}&plot=full`);
        if (response.data.Response === 'False') {
            return res.status(404).json({ error: response.data.Error || 'Movie not found' });
        }
        const movie = await Movie.findOne({ imdbID });
        const result = {
            ...response.data,
            hasDownloadLink: !!movie,
            downloadId: movie ? movie.id : null
        };
        res.json(result);
    } catch (error) {
        console.error('Error fetching movie details:', error.message);
        res.status(500).json({ error: 'Server error while fetching movie details' });
    }
});

// Generate Monetag ad link for a movie
router.get('/download/:id', [
    param('id').isMongoId().withMessage('Invalid download ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { id } = req.params;
        const movie = await Movie.findById(id);
        if (!movie || !movie.downloadUrl) {
            return res.status(404).json({ error: 'Download link not found' });
        }
        const monetagUrl = `https://go.monetag.com/${config.monetagId}?url=${encodeURIComponent(movie.downloadUrl)}`;
        res.json({
            redirectUrl: monetagUrl,
            title: movie.title
        });
    } catch (error) {
        console.error('Error generating download link:', error.message);
        res.status(500).json({ error: 'Server error while generating download link' });
    }
});

module.exports = router;
