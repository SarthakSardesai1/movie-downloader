const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    imdbID: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    year: { type: String },
    downloadUrl: { type: String, required: true }
});

module.exports = mongoose.model('Movie', movieSchema);
