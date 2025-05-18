```javascript
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { query, param } = require('express-validator');
const { validationResult } = require('express-validator');
const Movie = require('../models/movie');
const config = require('../config/config');

router.get('/search', [
    query('title').trim().notEmpty().withMessage('Search title is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { title } = req.query;
        const response = await axios.get(`http://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${config.omdbApiKey}`);
        if (response.data.Response === 'True') {
            const movies = await Promise.all(response.data.Search.map(async movie => {
                let dbMovie = null;
                try {
                    dbMovie = await Movie.findOne({ imdbID: movie.imdbID });
                } catch (dbError) {
                    console.error(`Error checking download link for ${movie.imdbID}:`, dbError.message);
                }
                return {
                    ...movie,
                    hasDownloadLink: !!dbMovie?.downloadUrl,
                    downloadId: dbMovie?._id
                };
            }));
            res.json(movies);
        } else {
            res.status(404).json({ error: response.data.Error || 'No movies found' });
        }
    } catch (error) {
        console.error('Error searching movies:', error.message);
        res.status(500).json({ error: 'Server error while searching movies' });
    }
});

router.get('/movie/:imdbID', [
    param('imdbID').trim().notEmpty().withMessage('IMDb ID is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
        const { imdbID } = req.params;
        const response = await axios.get(`http://www.omdbapi.com/?i=${imdbID}&apikey=${config.omdbApiKey}`);
        if (response.data.Response === 'True') {
            let dbMovie = null;
            try {
                dbMovie = await Movie.findOne({ imdbID });
            } catch (dbError) {
                console.error(`Error checking download link for ${imdbID}:`, dbError.message);
            }
            res.json({
                ...response.data,
                hasDownloadLink: !!dbMovie?.downloadUrl,
                downloadId: dbMovie?._id
            });
        } else {
            res.status(404).json({ error: response.data.Error || 'Movie not found' });
        }
    } catch (error) {
        console.error('Error fetching movie details:', error.message);
        res.status(500).json({ error: 'Server error while fetching movie details' });
    }
});

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
```
