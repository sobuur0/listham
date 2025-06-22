# 🎵 Listham

**The Dark Knight of Playlist Creation** - An intelligent playlist generator that creates custom Spotify playlists by mixing songs from multiple artists.

## ✨ Features

- 🔍 **Smart Artist Search** - Find artists with fuzzy matching
- 🎵 **Multi-Artist Playlists** - Mix songs from multiple artists seamlessly  
- ⚡ **Instant Creation** - Generate playlists in seconds
- 🔗 **Direct Spotify Links** - Get shareable playlist URLs immediately
- 🎯 **Customizable** - Control songs per artist (1-10 tracks)
- 🛡️ **Robust Error Handling** - Graceful failure with detailed logging

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Spotify Developer Account** 
- **Spotify Account** (required for playlist creation)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/listham.git
cd listham
npm install
```

### 2. Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app with these settings:
   - **App name**: Listham
   - **Redirect URI**: `http://127.0.0.1:3000/callback`
3. Save your **Client ID** and **Client Secret**

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit with your Spotify credentials
nano .env
```

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 4. Build & Run

```bash
# Build the project
npm run build

# Start the HTTP server
npm run start-http
```

### 5. Authenticate with Spotify

1. Visit `http://localhost:3000/auth`
2. Copy the `auth_url` from the JSON response
3. Visit that URL in your browser
4. Click "Agree" to authorize Listham
5. You should see "Authentication successful!"

### 6. Create Your First Playlist

```bash
curl -X POST http://localhost:3000/create-playlist \
  -H "Content-Type: application/json" \
  -d '{
    "artists": ["Taylor Swift", "Asake"],
    "playlist_name": "Pop Meets Afrobeats",
    "songs_per_artist": 5
  }'
```

🎉 **Success!** You'll get a JSON response with your Spotify playlist URL.

## 📚 API Documentation

### Authentication

#### `GET /auth`
Get Spotify authentication URL.

**Response:**
```json
{
  "auth_url": "https://accounts.spotify.com/authorize?...",
  "instructions": "Copy the auth_url and visit it in your browser"
}
```

#### `GET /health`
Check server and authentication status.

**Response:**
```json
{
  "status": "ok",
  "authenticated": true
}
```

### Playlist Operations

#### `POST /create-playlist`
Create a mixed playlist from multiple artists.

**Request Body:**
```json
{
  "artists": ["Artist 1", "Artist 2"],
  "playlist_name": "My Custom Playlist",
  "songs_per_artist": 5
}
```

**Response:**
```json
{
  "success": true,
  "playlist_url": "https://open.spotify.com/playlist/...",
  "playlist_id": "37i9dQZF1DX0XUsuxWHRQd",
  "tracks_added": 10,
  "requested_artists": ["Artist 1", "Artist 2"],
  "found_artists": ["Artist 1", "Artist 2"],
  "tracks": [...]
}
```

#### `POST /search-artist`
Search for artists on Spotify.

**Request Body:**
```json
{
  "artist_name": "Taylor Swift"
}
```

**Response:**
```json
{
  "artists": [
    {
      "id": "06HL4z0CvFAxyc27GXpf02",
      "name": "Taylor Swift",
      "popularity": 100,
      "followers": 114000000,
      "genres": ["pop", "country"]
    }
  ]
}
```

## 🛠️ Platform-Specific Setup

<details>
<summary><strong>🐧 Ubuntu/Debian</strong></summary>

```bash
# Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node

# Or via package manager
sudo apt update
sudo apt install nodejs npm

# Verify installation
node --version
npm --version
```
</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

```bash
# Install Node.js via Homebrew (recommended)
brew install node

# Or download from nodejs.org
# https://nodejs.org/en/download/

# Verify installation
node --version
npm --version
```
</details>

<details>
<summary><strong>🪟 Windows</strong></summary>

1. **Download Node.js** from [nodejs.org](https://nodejs.org/en/download/)
2. **Run the installer** and follow the setup wizard
3. **Open Command Prompt** or PowerShell
4. **Verify installation:**
   ```cmd
   node --version
   npm --version
   ```

**For Git Bash users:**
```bash
# Same commands as Linux/macOS work in Git Bash
npm install
npm run build
npm run start-http
```
</details>

## 🖥️ Claude Desktop Integration

**Status: Not Currently Supported**

Listham was built with MCP (Model Context Protocol) support, but Claude Desktop is not available for Ubuntu. The MCP server code is included (`src/index.ts`) but requires Claude Desktop to function.

**Recommended Testing Method:**
Use the HTTP API with curl commands as shown above, or build a custom client application.

## 🧪 Example Usage

### Create a Genre Mix
```bash
curl -X POST http://localhost:3000/create-playlist \
  -H "Content-Type: application/json" \
  -d '{
    "artists": ["Burna Boy", "Wizkid", "Davido"],
    "playlist_name": "Afrobeats Kings",
    "songs_per_artist": 7
  }'
```

### Cross-Genre Fusion
```bash
curl -X POST http://localhost:3000/create-playlist \
  -H "Content-Type: application/json" \
  -d '{
    "artists": ["Billie Eilish", "The Weeknd", "Dua Lipa"],
    "playlist_name": "Dark Pop Vibes",
    "songs_per_artist": 6
  }'
```

### Artist Discovery
```bash
curl -X POST http://localhost:3000/search-artist \
  -H "Content-Type: application/json" \
  -d '{"artist_name": "Seyi Vibez"}'
```

## 🏗️ Project Structure

```
listham/
├── src/
│   ├── index.ts          # MCP server
│   └── standalone.ts     # HTTP server
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment template
└── README.md            # Readme file
```

## 🔧 Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start MCP server (requires Claude Desktop)
- `npm run start-http` - Start HTTP server (recommended)
- `npm run dev` - Build and start MCP server
- `npm run dev-http` - Build and start HTTP server

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SPOTIFY_CLIENT_ID` | Your Spotify app client ID | ✅ |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify app client secret | ✅ |

## 🚧 Roadmap

- [ ] **Flutter Mobile App** - Cross-platform mobile interface
- [ ] **YouTube Music Support** - Expand beyond Spotify
- [ ] **Apple Music Integration** - iOS ecosystem support
- [ ] **Playlist Editing** - Modify existing playlists
- [ ] **Social Sharing** - Share playlist creations
- [ ] **Batch Operations** - Create multiple playlists at once
- [ ] **Web Dashboard** - Browser-based UI

## 🐛 Troubleshooting

### "Client ID Missing" Error
- Ensure `.env` file exists with correct Spotify credentials
- Check that environment variables are loaded: `cat .env`

### "Authentication Failed"
- Verify redirect URI in Spotify app settings: `http://127.0.0.1:3000/callback`
- Make sure you're using `127.0.0.1` not `localhost`

### "Cannot GET /" Error
- Visit the correct endpoints: `/auth`, `/health`, or use POST requests
- The root path `/` is not implemented

### Build Errors
- Ensure Node.js version is 18+: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify Web API** - For the powerful music platform
- **Model Context Protocol** - For the MCP server architecture
- **The Dark Knight** - For inspiring the name 🦇

---

**Built with ❤️