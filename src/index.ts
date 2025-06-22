#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'http://127.0.0.1:8888/callback'
});

class SpotifyMCPServer {
    private server: Server;
    private isAuthenticated = false;

    constructor() {
        this.server = new Server(
            {
                name: 'spotify-playlist-server',
                version: '0.1.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'search_artist',
                        description: 'Search for an artist on Spotify',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                artist_name: {
                                    type: 'string',
                                    description: 'Name of the artist to search for',
                                },
                            },
                            required: ['artist_name'],
                        },
                    },
                    {
                        name: 'get_artist_top_tracks',
                        description: 'Get top tracks for an artist',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                artist_id: {
                                    type: 'string',
                                    description: 'Spotify artist ID',
                                },
                                country: {
                                    type: 'string',
                                    description: 'Country code (default: US)',
                                    default: 'US',
                                },
                            },
                            required: ['artist_id'],
                        },
                    },
                    {
                        name: 'create_mixed_playlist',
                        description: 'Create a playlist mixing songs from multiple artists',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                artists: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of artist names',
                                },
                                playlist_name: {
                                    type: 'string',
                                    description: 'Name for the new playlist',
                                },
                                songs_per_artist: {
                                    type: 'number',
                                    description: 'Number of songs per artist (default: 5)',
                                    default: 5,
                                },
                            },
                            required: ['artists', 'playlist_name'],
                        },
                    },
                    {
                        name: 'authenticate_spotify',
                        description: 'Get Spotify authentication URL',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'set_access_token',
                        description: 'Set the Spotify access token after authentication',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                access_token: {
                                    type: 'string',
                                    description: 'Spotify access token',
                                },
                                refresh_token: {
                                    type: 'string',
                                    description: 'Spotify refresh token',
                                },
                            },
                            required: ['access_token'],
                        },
                    },
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'authenticate_spotify':
                        return await this.authenticateSpotify();

                    case 'set_access_token':
                        return await this.setAccessToken(args?.access_token as string, args?.refresh_token as string);

                    case 'search_artist':
                        return await this.searchArtist(args?.artist_name as string);

                    case 'get_artist_top_tracks':
                        return await this.getArtistTopTracks(args?.artist_id as string, (args?.country as string) || 'US');

                    case 'create_mixed_playlist':
                        return await this.createMixedPlaylist(
                            args?.artists as string[],
                            args?.playlist_name as string,
                            (args?.songs_per_artist as number) || 5
                        );

                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            } catch (error) {
                throw new McpError(
                    ErrorCode.InternalError,
                    `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        });
    }

    private async authenticateSpotify() {
        const scopes = [
            'playlist-modify-public',
            'playlist-modify-private',
            'user-read-private',
        ];

        const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state');

        return {
            content: [
                {
                    type: 'text',
                    text: `Please visit this URL to authenticate with Spotify:\n\n${authorizeURL}\n\nAfter authentication, you'll get a code. Use the 'set_access_token' tool with that code.`,
                },
            ],
        };
    }

    private async setAccessToken(accessToken: string, refreshToken?: string) {
        spotifyApi.setAccessToken(accessToken);
        if (refreshToken) {
            spotifyApi.setRefreshToken(refreshToken);
        }
        this.isAuthenticated = true;

        return {
            content: [
                {
                    type: 'text',
                    text: 'Successfully authenticated with Spotify!',
                },
            ],
        };
    }

    private async searchArtist(artistName: string) {
        if (!this.isAuthenticated) {
            throw new Error('Please authenticate with Spotify first');
        }

        const data = await spotifyApi.searchArtists(artistName, { limit: 10 });
        if (!data.body.artists) {
            throw new Error('No artists data returned from Spotify');
        }

        const artists = data.body.artists.items.map((artist: any) => ({
            id: artist.id,
            name: artist.name,
            popularity: artist.popularity,
            followers: artist.followers.total,
            genres: artist.genres,
        }));

        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${artists.length} artists:\n\n${JSON.stringify(artists, null, 2)}`,
                },
            ],
        };
    }

    private async getArtistTopTracks(artistId: string, country: string = 'US') {
        if (!this.isAuthenticated) {
            throw new Error('Please authenticate with Spotify first');
        }

        const data = await spotifyApi.getArtistTopTracks(artistId, country);
        const tracks = data.body.tracks.map((track: any) => ({
            id: track.id,
            name: track.name,
            popularity: track.popularity,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url,
            external_urls: track.external_urls,
        }));

        return {
            content: [
                {
                    type: 'text',
                    text: `Top tracks:\n\n${JSON.stringify(tracks, null, 2)}`,
                },
            ],
        };
    }

    private async createMixedPlaylist(artists: string[], playlistName: string, songsPerArtist: number = 5) {
        if (!this.isAuthenticated) {
            throw new Error('Please authenticate with Spotify first');
        }

        const allTracks = [];

        const me = await spotifyApi.getMe();
        const userId = me.body.id;

        for (const artistName of artists) {
            try {
                const artistSearch = await spotifyApi.searchArtists(artistName, { limit: 1 });
                if (!artistSearch.body.artists || artistSearch.body.artists.items.length === 0) {
                    console.warn(`Artist not found: ${artistName}`);
                    continue;
                }

                const artist = artistSearch.body.artists.items[0];

                const topTracks = await spotifyApi.getArtistTopTracks(artist.id, 'US');
                const tracks = topTracks.body.tracks.slice(0, songsPerArtist);

                allTracks.push(...tracks.map((track: any) => ({
                    uri: track.uri,
                    name: track.name,
                    artist: artist.name,
                })));
            } catch (error) {
                console.warn(`Error getting tracks for ${artistName}:`, error instanceof Error ? error.message : String(error));
            }
        }

        if (allTracks.length === 0) {
            throw new Error('No tracks found for the specified artists');
        }

        const playlist = await spotifyApi.createPlaylist(playlistName, {
            description: `Mixed playlist featuring: ${artists.join(', ')}`,
            public: false,
        });

        const trackUris = allTracks.map(track => track.uri);
        await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully created playlist "${playlistName}"!\n\n` +
                        `Playlist URL: ${playlist.body.external_urls.spotify}\n` +
                        `Added ${allTracks.length} tracks from ${artists.length} artists:\n\n` +
                        allTracks.map(track => `• ${track.name} - ${track.artist}`).join('\n'),
                },
            ],
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Spotify MCP server running on stdio');
    }
}

const server = new SpotifyMCPServer();
server.run().catch(console.error);