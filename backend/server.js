const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Config
const OMDB_API_KEY = process.env.OMDB_API_KEY; // Get from environment variables
const MONETAG_ID = process.env.MONETAG_ID; // Your Monetag publisher ID

// Routes
// Search movies from OMDb API
app.get('/api/search', async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'Movie title is required' });
    }

    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}`);
    
    if (response.data.Response === 'False') {
      return res.status(404).json({ error: response.data.Error || 'Movies not found' });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error searching movies:', error);
    res.status(500).json({ error: 'Server error while searching movies' });
  }
});

// Get movie details from OMDb API
app.get('/api/movie/:imdbID', async (req, res) => {
  try {
    const { imdbID } = req.params;
    const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=full`);
    
    if (response.data.Response === 'False') {
      return res.status(404).json({ error: response.data.Error || 'Movie not found' });
    }

    // Check if we have a download link for this movie in our database
    const moviesData = await fs.readFile(path.join(__dirname, 'data', 'movies.json'), 'utf-8');
    const movies = JSON.parse(moviesData);
    const movie = movies.find(m => m.imdbID === imdbID);
    
    // Combine OMDb data with our download info
    const result = { 
      ...response.data, 
      hasDownloadLink: Boolean(movie),
      downloadId: movie ? movie.id : null
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).json({ error: 'Server error while fetching movie details' });
  }
});

// Generate Monetag ad link for a movie
app.get('/api/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const moviesData = await fs.readFile(path.join(__dirname, 'data', 'movies.json'), 'utf-8');
    const movies = JSON.parse(moviesData);
    const movie = movies.find(m => m.id === id);
    
    if (!movie || !movie.downloadUrl) {
      return res.status(404).json({ error: 'Download link not found' });
    }

    // Generate Monetag link (this URL structure will depend on your Monetag setup)
    const monetagUrl = `https://go.monetag.com/${MONETAG_ID}?url=${encodeURIComponent(movie.downloadUrl)}`;
    
    res.json({ 
      redirectUrl: monetagUrl,
      title: movie.title
    });
  } catch (error) {
    console.error('Error generating download link:', error);
    res.status(500).json({ error: 'Server error while generating download link' });
  }
});

// Admin routes (require authentication in a real application)
// GET all movies in our database
app.get('/api/admin/movies', async (req, res) => {
  try {
    const moviesData = await fs.readFile(path.join(__dirname, 'data', 'movies.json'), 'utf-8');
    const movies = JSON.parse(moviesData);
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies list:', error);
    res.status(500).json({ error: 'Server error while fetching movies list' });
  }
});

// ADD a new movie to our database
app.post('/api/admin/movies', async (req, res) => {
  try {
    const { imdbID, title, year, downloadUrl } = req.body;
    
    if (!imdbID || !title || !downloadUrl) {
      return res.status(400).json({ error: 'imdbID, title, and downloadUrl are required' });
    }
    
    const moviesData = await fs.readFile(path.join(__dirname, 'data', 'movies.json'), 'utf-8');
    const movies = JSON.parse(moviesData);
    
    // Check if movie already exists
    const existingMovie = movies.find(m => m.imdbID === imdbID);
    if (existingMovie) {
      return res.status(400).json({ error: 'Movie already exists in database' });
    }
    
    // Add new movie
    const newMovie = {
      id: Date.now().toString(), // Simple ID generation
      imdbID,
      title,
      year: year || '',
      downloadUrl
    };
    
    movies.push(newMovie);
    
    await fs.writeFile(path.join(__dirname, 'data', 'movies.json'), JSON.stringify(movies, null, 2));
    
    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Error adding movie:', error);
    res.status(500).json({ error: 'Server error while adding movie' });
  }
});

// UPDATE a movie in our database
app.put('/api/admin/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, year, downloadUrl } = req.body;
    
    const moviesData = await fs.readFile(path.join(__dirname, 'data', 'movies.json'), 'utf-8');
    let movies = JSON.parse(moviesData);
    
    const movieIndex = movies.findIndex(m => m.id === id);
    if (movieIndex === -1) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Update movie
    movies[movieIndex] = {
      ...movies[movieIndex],
      title: title || movies[movieIndex].title,
      year: year || movies[movieIndex].year,
      downloadUrl: downloadUrl || movies[movieIndex].downloadUrl
    };
    
    await fs.writeFile(path.join(__dirname, 'data', 'movies.json'), JSON.stringify(movies, null, 2));
    
    res.json(movies[movieIndex]);
  } catch (error) {
    console.error('Error updating movie:', error);
    res.status(500).json({ error: 'Server error while updating movie' });
  }
});

// DELETE a movie from our database
app.delete('/api/admin/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const moviesData = await fs.readFile(path.join(__dirname, 'data', 'movies.json'), 'utf-8');
    let movies = JSON.parse(moviesData);
    
    const movieIndex = movies.findIndex(m => m.id === id);
    if (movieIndex === -1) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Remove movie
    movies.splice(movieIndex, 1);
    
    await fs.writeFile(path.join(__dirname, 'data', 'movies.json'), JSON.stringify(movies, null, 2));
    
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ error: 'Server error while deleting movie' });
  }
});

// Simple admin panel route (in a real app, this would be protected)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;