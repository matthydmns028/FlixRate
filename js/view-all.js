// Ensure this matches your shared configuration
const CONFIG = {
    TMDB_KEY: "c46b16d258dbd7eb7c4bf601760a349",
    TMDB_BEARER: "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNDZiMTZkMjU4ZGJkN2ViN2M0YmY2MDE3NjBhMzQ5ZSIsIm5iZiI6MTc3MzEwODM3Ny40NDQsInN1YiI6IjY5YWY3Yzk5ZmViODU5OTI1Yzc5NGQ4MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NnIuSBLCsNjVFtcdNeE3soE8xVtQQXsXW5T9jvwhgA8",
    TMDB_BASE: "https://api.themoviedb.org/3",
    TMDB_IMG_W500: "https://image.tmdb.org/t/p/w500",
    JIKAN_BASE: "https://api.jikan.moe/v4"
};

const urlParams = new URLSearchParams(window.location.search);
const type = urlParams.get('type') || 'movie'; 
const grid = document.getElementById('mediaGrid');
const titleLabel = document.getElementById('pageTitle');

async function initPage() {
    let mediaList = [];

    try {
        if (type === 'anime') {
            titleLabel.innerText = "All Anime";
            const resp = await fetch(`${CONFIG.JIKAN_BASE}/top/anime`);
            const data = await resp.json();
            mediaList = data.data.map(item => ({
                title: item.title,
                year: item.aired.prop.from.year || 'N/A',
                image: item.images.jpg.large_image_url
            }));
        } else {
            titleLabel.innerText = type === 'movie' ? "All Movies" : "All TV Series";
            const endpoint = type === 'movie' ? 'movie/popular' : 'tv/popular';
            const resp = await fetch(`${CONFIG.TMDB_BASE}/${endpoint}?page=1`, {
                headers: { 'Authorization': `Bearer ${CONFIG.TMDB_BEARER}` }
            });
            const data = await resp.json();
            mediaList = data.results.map(item => ({
                title: item.title || item.name,
                year: (item.release_date || item.first_air_date || "").split('-')[0],
                image: CONFIG.TMDB_IMG_W500 + item.poster_path
            }));
        }
        render(mediaList);
        setupSearch(mediaList);
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p>Error loading content. Please check your connection.</p>`;
    }
}

function render(items) {
    if(items.length === 0) {
        grid.innerHTML = `<p class="loader">No results found.</p>`;
        return;
    }
    grid.innerHTML = items.map(item => `
        <div class="media-card">
            <div class="poster-wrapper">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
            </div>
            <div class="media-info">
                <h3>${item.title}</h3>
                <p>${item.year}</p>
            </div>
        </div>
    `).join('');
}

function setupSearch(fullList) {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = fullList.filter(i => i.title.toLowerCase().includes(term));
        render(filtered);
    });
}

initPage();