document.addEventListener('DOMContentLoaded', function() {
    // Initialize Telegram WebApp
    const tgApp = window.Telegram?.WebApp;
    if (tgApp) {
        tgApp.ready();
        tgApp.expand();
        if (tgApp.themeParams) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', tgApp.themeParams.bg_color || '#1a1a1a');
            document.documentElement.style.setProperty('--tg-theme-text-color', tgApp.themeParams.text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-button-color', tgApp.themeParams.button_color || '#3390ec');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', tgApp.themeParams.button_text_color || '#ffffff');
        }
    }

    // Elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statusMessage = document.getElementById('statusMessage');
    const emptyState = document.getElementById('emptyState');
    const movieCardTemplate = document.getElementById('movieCardTemplate');
    const noDownloadTemplate = document.getElementById('noDownloadTemplate');

    // API Base URL
    const API_BASE_URL = 'https://movie-downloader-pljq.onrender.com';

    // Event Listeners
    searchButton.addEventListener('click', searchMovies);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });

    // Search Movies Function
    async function searchMovies() {
        const query = searchInput.value.trim();
        if (!query) {
            showStatus('Please enter a movie title', 'warning');
            return;
        }
        showLoading(true);
        emptyState.classList.add('hidden');
        resultsContainer.innerHTML = '';
        try {
            const response = await fetch(`${API_BASE_URL}/search?title=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.error) {
                showLoading(false);
                showStatus(data.error, 'error');
                emptyState.classList.remove('hidden');
            } else if (data.Search && data.Search.length > 0) {
                const detailedMovies = await Promise.all(
                    data.Search.map(async (movie) => {
                        const detailResponse = await fetch(`${API_BASE_URL}/movie/${movie.imdbID}`);
                        const detailData = await detailResponse.json();
                        return detailData.error ? movie : detailData;
                    })
                );
                displayMovies(detailedMovies);
                showLoading(false);
            } else {
                showLoading(false);
                showStatus('No movies found matching your search', 'error');
                emptyState.classList.remove('hidden');
            }
        } catch (error) {
            showLoading(false);
            showStatus('An error occurred while searching', 'error');
            emptyState.classList.remove('hidden');
        }
    }

    // Display Movies Function
    function displayMovies(movies) {
        resultsContainer.innerHTML = '';
        movies.forEach(movie => {
            const movieCard = movieCardTemplate.content.cloneNode(true);
            movieCard.querySelector('.movie-title').textContent = movie.Title;
            movieCard.querySelector('.movie-year').textContent = movie.Year;
            movieCard.querySelector('.movie-plot').textContent = movie.Plot || 'No plot available';
            const posterElement = movieCard.querySelector('.movie-poster');
            if (movie.Poster && movie.Poster !== 'N/A') {
                posterElement.src = movie.Poster;
                posterElement.alt = `${movie.Title} poster`;
            } else {
                posterElement.src = 'https://via.placeholder.com/300x450?text=No+Poster';
                posterElement.alt = 'No poster available';
            }
            const downloadSection = movieCard.querySelector('.download-section');
            const downloadButton = downloadSection.querySelector('button');
            if (movie.hasDownloadLink && movie.downloadId) {
                downloadButton.addEventListener('click', async function() {
                    try {
                        const response = await fetch(`${API_BASE_URL}/download/${movie.downloadId}`);
                        const data = await response.json();
                        if (data.redirectUrl) {
                            alert(`Redirecting to Monetag ad. After viewing, you'll be redirected to the download link.`);
                            window.location.href = data.redirectUrl;
                        } else {
                            showStatus('Download link unavailable', 'error');
                        }
                    } catch (error) {
                        showStatus('Error fetching download link', 'error');
                    }
                });
            } else {
                downloadButton.remove();
                const noDownload = noDownloadTemplate.content.cloneNode(true);
                downloadSection.appendChild(noDownload);
            }
            resultsContainer.appendChild(movieCard);
        });
    }

    // Show/Hide Loading Indicator
    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
        }
    }

    // Show Status Message
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('hidden', 'bg-red-900', 'bg-yellow-900', 'bg-green-900');
        switch(type) {
            case 'error':
                statusMessage.classList.add('bg-red-900');
                break;
            case 'warning':
                statusMessage.classList.add('bg-yellow-900');
                break;
            case 'success':
                statusMessage.classList.add('bg-green-900');
                break;
        }
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }
});
