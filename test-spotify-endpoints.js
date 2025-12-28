/**
 * Quick test script for Spotify user data endpoints
 * Run: node test-spotify-endpoints.js <userId>
 */

const userId = process.argv[2] || '1';
const baseUrl = 'http://localhost:3001';

async function testEndpoint(name, url) {
    try {
        console.log(`\n🧪 Testing ${name}...`);
        const response = await fetch(`${baseUrl}${url}`);
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ ${name}: Success`);
            console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
            if (data.artists) console.log(`   Artists: ${data.artists.length}`);
            if (data.tracks) console.log(`   Tracks: ${data.tracks.length}`);
            if (data.items) console.log(`   Items: ${data.items.length}`);
            if (data.topArtists) console.log(`   Top Artists: ${data.topArtists.length}`);
            if (data.topTracks) console.log(`   Top Tracks: ${data.topTracks.length}`);
            if (data.playlists) console.log(`   Playlists: ${data.playlists.length}`);
            if (data.recentlyPlayed) console.log(`   Recently Played: ${data.recentlyPlayed.length}`);
        } else {
            console.log(`❌ ${name}: Failed (${response.status})`);
            console.log(`   Error: ${data.error || data.message || 'Unknown error'}`);
        }
    } catch (err) {
        console.log(`❌ ${name}: Error - ${err.message}`);
    }
}

async function runTests() {
    console.log(`\n🚀 Testing Spotify User Data Endpoints for userId: ${userId}`);
    console.log(`   Base URL: ${baseUrl}\n`);

    // Test endpoints
    await testEndpoint('Top Artists', `/api/spotify/top-artists?userId=${userId}&timeRange=medium_term&limit=10`);
    await testEndpoint('Top Tracks', `/api/spotify/top-tracks?userId=${userId}&timeRange=medium_term&limit=10`);
    await testEndpoint('Recently Played', `/api/spotify/recently-played?userId=${userId}&limit=20`);
    await testEndpoint('User Context', `/api/spotify/user-context?userId=${userId}`);
    
    console.log('\n✅ All tests completed!\n');
}

runTests();

