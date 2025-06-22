#!/usr/bin/env node

import express, { Request, Response } from 'express';
import cors from 'cors';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

console.log('🔍 Environment check:');
console.log('Client ID:', process.env.SPOTIFY_CLIENT_ID ? 'Found' : 'Missing');
console.log('Client Secret:', process.env.SPOTIFY_CLIENT_SECRET ? 'Found' : 'Missing');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'http://127.0.0.1:3000/callback'
});

let isAuthenticated = false;

app.get('/auth', (req: Request, res: Response) => {
    if (!process.env.SPOTIFY_CLIENT_ID) {
        return res.status(500).json({
            error: 'Spotify Client ID not configured',
            help: 'Make sure your .env file has SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET'
        });
    }

    const scopes = [
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-private',
    ];

    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state');
    console.log('🔗 Auth URL generated:', authorizeURL);

    res.json({
        auth_url: authorizeURL,
        instructions: 'Copy the auth_url and visit it in your browser'
    });
});

app.get('/callback', async (req: Request, res: Response) => {
    const { code } = req.query;

    try {
        const data = await spotifyApi.authorizationCodeGrant(code as string);
        spotifyApi.setAccessToken(data.body.access_token);
        spotifyApi.setRefreshToken(data.body.refresh_token);
        isAuthenticated = true;

        res.send('Authentication successful! You can close this window.');
    } catch (error) {
        res.status(400).send('Authentication failed');
    }
});

app.post('/search-artist', async (req: Request, res: Response) => {
    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { artist_name } = req.body;
        const data = await spotifyApi.searchArtists(artist_name, { limit: 10 });

        if (!data.body.artists) {
            return res.status(404).json({ error: 'No artists found' });
        }

        const artists = data.body.artists.items.map((artist: any) => ({
            id: artist.id,
            name: artist.name,
            popularity: artist.popularity,
            followers: artist.followers.total,
            genres: artist.genres,
        }));

        res.json({ artists });
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

app.post('/create-playlist', async (req: Request, res: Response) => {
    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { artists, playlist_name, songs_per_artist = 5 } = req.body;
        const allTracks = [];
        const foundArtists = [];

        for (const artistName of artists) {
            try {
                console.log(`🔍 Searching for artist: ${artistName}`);

                const artistSearch = await spotifyApi.searchArtists(artistName, { limit: 5 });
                if (!artistSearch.body.artists || artistSearch.body.artists.items.length === 0) {
                    console.warn(`❌ Artist not found: ${artistName}`);
                    continue;
                }

                let bestMatch = artistSearch.body.artists.items[0];
                for (const artist of artistSearch.body.artists.items) {
                    if (artist.name.toLowerCase() === artistName.toLowerCase()) {
                        bestMatch = artist;
                        break;
                    }
                }

                console.log(`✅ Found artist: ${bestMatch.name} (searched for: ${artistName})`);
                foundArtists.push(bestMatch.name);

                const topTracks = await spotifyApi.getArtistTopTracks(bestMatch.id, 'US');
                const tracks = topTracks.body.tracks.slice(0, songs_per_artist);

                console.log(`🎵 Adding ${tracks.length} tracks from ${bestMatch.name}`);

                allTracks.push(...tracks.map((track: any) => ({
                    uri: track.uri,
                    name: track.name,
                    artist: bestMatch.name,
                    searched_for: artistName
                })));
            } catch (error) {
                console.warn(`❌ Error getting tracks for ${artistName}:`, error instanceof Error ? error.message : String(error));
            }
        }

        if (allTracks.length === 0) {
            return res.status(400).json({ error: 'No tracks found for any of the specified artists' });
        }

        console.log(`📝 Creating playlist with ${allTracks.length} tracks from: ${foundArtists.join(', ')}`);

        const playlist = await spotifyApi.createPlaylist(playlist_name, {
            description: `Mixed playlist featuring: ${foundArtists.join(', ')} (requested: ${artists.join(', ')})`,
            public: false,
        });

        const trackUris = allTracks.map(track => track.uri);
        await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

        res.json({
            success: true,
            playlist_url: playlist.body.external_urls.spotify,
            playlist_id: playlist.body.id,
            tracks_added: allTracks.length,
            requested_artists: artists,
            found_artists: foundArtists,
            tracks: allTracks.map(track => ({
                name: track.name,
                artist: track.artist,
                searched_for: track.searched_for
            }))
        });

    } catch (error) {
        console.error('❌ Playlist creation error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', authenticated: isAuthenticated });
});

app.listen(port, () => {
    console.log(`🎵 Spotify Playlist Server running at http://localhost:${port}`);
    console.log(`📝 Visit http://localhost:${port}/auth to authenticate`);
});