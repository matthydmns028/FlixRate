# FlixRate 🎬📺🎌

FlixRate is a comprehensive, responsive web application for discovering, tracking, and rating Movies, TV Series, and Anime. Built with Vanilla JavaScript and Firebase, it combines the power of the TMDB and Jikan APIs to provide a unified platform for media enthusiasts to manage their watchlists, customize their profiles, and connect with friends.

## ✨ Features

- **Universal Discovery:** Browse and search a massive catalog of Movies, TV Shows, and Anime via TMDB and Jikan API integration.
- **User Authentication:** Secure login and registration powered by Firebase Authentication.
- **Custom User Profiles:** Personalize your presence with an avatar, bio, and a "Top 5 Highlights" showcase. Profiles are shareable via public links!
- **Cloud Watchlists:** Save titles to your personal watchlist which stays synced across your devices using Firestore.
- **Quick-Action Context Menu:** Custom right-click menu on any media card to instantly add items to your Watchlist, Highlights, or copy the title without leaving the page.
- **Social & Community:** Send friend requests, view other users' profiles, and participate in community discussions in the integrated Forum.
- **Dynamic Theming:** Seamless page transitions, hover effects, and automatic color extraction from media posters.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom variables, Flexbox/Grid), Vanilla JavaScript (ESM, modular architecture).
- **Backend / Database:** Firebase (Firestore DB, Firebase Authentication, Firebase Hosting).
- **APIs:**
  - [The Movie Database (TMDB) API](https://developer.themoviedb.org/docs) - Movies & TV Shows.
  - [Jikan API](https://docs.api.jikan.moe/) - Unofficial MyAnimeList API for Anime.

## 📂 Project Structure

```text
FlixRate/
├── index.html            # Landing page (Trending, Hero carousel)
├── browse.html           # Dedicated discovery pages per category
├── detail.html           # Deep dive into specific media (Synopsis, Trailers, Ratings)
├── profile.html          # User dashboards and highlight pickers
├── watchlist.html        # Synced saved titles
├── forum.html            # Community message board
├── css/                  # Modular stylesheets
└── js/
    ├── app.js            # Main initialization and UI helpers
    ├── api.js            # Centralized API fetch controllers
    ├── auth.js           # Firebase Auth logic and session states
    ├── config.js         # API Keys and Global Configurations
    ├── contextmenu.js    # Custom right-click logic
    ├── detail.js         # View/Rate/Add media logic
    ├── firebase-init.js  # Firebase app initialization
    └── profile.js        # Profile updating and highlight UI
```

## 🚀 Getting Started

### Prerequisites

- A modern web browser.
- A local development server (like VS Code's "Live Server" extension) because ES Modules (`<script type="module">`) require a server to run avoiding CORS issues.
- Your own API keys for TMDB and a Firebase Project.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/FlixRate.git
   cd FlixRate
   ```

2. **Configure APIs:**
   - Open `js/config.js` and input your TMDB API keys.
   - Jikan API is open and does not require an API key by default.

3. **Configure Firebase:**
   - Create a Firebase Web App in your Firebase Console.
   - Enable **Firestore Database** and **Authentication** (Email/Password).
   - Put your Firebase configuration details into `js/firebase-init.js`.

4. **Run the App:**
   - Open the project directory in your editor.
   - Start a local development server (e.g., Live Server in VS Code on port `5500` or `5501`).
   - Navigate to `http://127.0.0.1:5500/index.html`.

## 🌐 Deployment

This project is configured out-of-the-box for Firebase Hosting.
If you have the Firebase CLI installed, you can simply run:

```bash
firebase deploy
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/FlixRate/issues).

## 📝 License

This project is open-source and available under the [MIT License](LICENSE). Data and images are provided by TMDB and MyAnimeList (via Jikan).
