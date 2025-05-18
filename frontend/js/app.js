const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const statusMessage = document.getElementById('status-message');
const moviesContainer = document.getElementById('movies-container');
const API_BASE_URL = 'https://movie-downloader-pljq.onrender.com'; // Update to your Render URL
let tgApp = null;

// Initialize Telegram WebApp
if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    tgApp = Telegram.WebApp;
    tgApp.ready();
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

async function searchMovies() {
    const query = searchInput.value.trim();
    if (!query) {
        showStatus('Please enter a movie title', 'error');
        return;
    }
    showStatus('Searching...', 'info');
    try {
        const response = await fetch(`${API_BASE_URL}/search?title=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok) {
            if (data.length > 0) {
                displayMovies(data);
                showStatus('Movies found!', 'success');
            } else {
                showStatus('No movies found', 'error');
            }
        } else {
            showStatus(data.error || 'Error searching movies', 'error');
        }
    } catch (error) {
        showStatus('Error searching movies', 'error');
        console.error('Search error:', error);
    }
}

function displayMovies(movies) {
    moviesContainer.innerHTML = '';
    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.innerHTML = `
            <img src="${movie.Poster !== 'N/A' ? movie.Poster : '/img/placeholder.png'}" alt="${movie.Title}">
            <h3>${movie.Title}</h3>
            <p>${movie.Year}</p>
            <button class="download-button" ${!movie.hasDownloadLink ? 'disabled' : ''}>
                ${movie.hasDownloadLink ? 'Unlock Download' : 'Download not available'}
            </button>
        `;
        if (movie.hasDownloadLink && movie.downloadId) {
            const downloadButton = movieCard.querySelector('.download-button');
            downloadButton.addEventListener('click', async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/download/${movie.downloadId}`);
                    const data = await response.json();
                    if (data.redirectUrl) {
                        alert(`Redirecting to ad for "${data.title}" download.`);
                        if (tgApp) {
                            tgApp.openLink(data.redirectUrl);
                        } else {
                            window.location.href = data.redirectUrl;
                        }
                    } else {
                        showStatus('Download link unavailable', 'error');
                    }
                } catch (error) {
                    showStatus('Error fetching download link', 'error');
                    console.error('Download error:', error);
                }
            });
        }
        moviesContainer.appendChild(movieCard);
    });
}

// Attach event listeners
searchButton.addEventListener('click', searchMovies);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchMovies();
    }
});
