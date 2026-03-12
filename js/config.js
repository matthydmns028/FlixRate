// ============================================================
// FlixRate – API Configuration
// TMDB_KEY   : v3 API key  (used as ?api_key= fallback)
// TMDB_BEARER: v4 Read Access Token (used as Authorization: Bearer ...)
// Both are from: https://www.themoviedb.org/settings/api
// ============================================================

const CONFIG = {
  TMDB_KEY: 'c46b16d258dbd7eb7c4bf601760a349',
  TMDB_BEARER: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNDZiMTZkMjU4ZGJkN2ViN2M0YmY2MDE3NjBhMzQ5ZSIsIm5iZiI6MTc3MzEwODM3Ny40NDQsInN1YiI6IjY5YWY3Yzk5ZmViODU5OTI1Yzc5NGQ4MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NnIuSBLCsNjVFtcdNeE3soE8xVtQQXsXW5T9jvwhgA8',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  TMDB_IMG_ORIGINAL: 'https://image.tmdb.org/t/p/original',
  TMDB_IMG_W500: 'https://image.tmdb.org/t/p/w500',
  TMDB_IMG_W300: 'https://image.tmdb.org/t/p/w300',
  JIKAN_BASE: 'https://api.jikan.moe/v4',
  HERO_INTERVAL: 7000,          // ms between hero auto-rotations
  COLOR_SAMPLE_SIZE: 10,        // step size for canvas pixel sampling

  // Spotify Configuration (User must generate an App in the Spotify Dev Dashboard)
  SPOTIFY_CLIENT_ID: 'eb9471e5eb074c28ace93977bf15d3b2', 
  SPOTIFY_CLIENT_SECRET: 'cf71460d1ee141d88b4689dd51873551',
  SPOTIFY_REDIRECT_URI: 'http://127.0.0.1:5500/music.html', // Note: Not needed for Client Credentials Flow, but kept for legacy
};
