import express, { Request, Response, Router } from 'express';
import { refinePlaylistWithChat } from '../services/agenticEngine.js';
import * as spotifyHandler from '../services/spotifyHandler.js';

const router: Router = express.Router();

// In-memory storage for collab sessions (use database in production)
interface CollabSession {
  id: string;
  code: string;
  name: string;
  description: string;
  mood: string;
  creatorId: string;
  creatorName: string;
  members: Array<{
    id: string;
    name: string;
    joinedAt: Date;
  }>;
  prompts: Array<{
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
  }>;
  messages: Array<{
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
    type?: 'message' | 'action';
  }>;
  tracks: Array<{
    name: string;
    artist: string;
    uri: string;
    image?: string;
    addedBy: string;
  }>;
  currentPlaylist: any | null;
  isLive: boolean;
  maxMembers: number;
  createdAt: Date;
  lastActivity: Date;
}

const collabSessions: Map<string, CollabSession> = new Map();

// Generate unique session code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique session ID
function generateId(): string {
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Create a new collab session
router.post('/create', (req: Request, res: Response): void => {
  try {
    const { name, description, mood, userId, userName } = req.body;

    if (!name || !userId || !userName) {
      res.status(400).json({
        success: false,
        error: 'Name, userId, and userName are required'
      });
      return;
    }

    const session: CollabSession = {
      id: generateId(),
      code: generateCode(),
      name,
      description: description || '',
      mood: mood || '',
      creatorId: userId,
      creatorName: userName,
      members: [{
        id: userId,
        name: userName,
        joinedAt: new Date()
      }],
      prompts: [],
      messages: [],
      tracks: [],
      currentPlaylist: null,
      isLive: true,
      maxMembers: 3,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    collabSessions.set(session.code, session);

    console.log(`[Collab] Session created: ${session.code} by ${userName}`);

    res.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        members: session.members,
        maxMembers: session.maxMembers
      }
    });
  } catch (error: any) {
    console.error('[Collab] Create error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Join an existing session
router.post('/join', (req: Request, res: Response): void => {
  try {
    const { code, userId, userName } = req.body;

    if (!code || !userId || !userName) {
      res.status(400).json({
        success: false,
        error: 'Code, userId, and userName are required'
      });
      return;
    }

    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found. Check the code and try again.'
      });
      return;
    }

    if (!session.isLive) {
      res.status(400).json({
        success: false,
        error: 'This session has ended.'
      });
      return;
    }

    // Check if already a member
    const existingMember = session.members.find(m => m.id === userId);
    if (existingMember) {
      res.json({
        success: true,
        session: {
          id: session.id,
          code: session.code,
          name: session.name,
          description: session.description,
          mood: session.mood,
          members: session.members,
          prompts: session.prompts,
          maxMembers: session.maxMembers,
          creatorName: session.creatorName
        },
        message: 'Already a member'
      });
      return;
    }

    // Check max members
    if (session.members.length >= session.maxMembers) {
      res.status(400).json({
        success: false,
        error: `Session is full (max ${session.maxMembers} members)`
      });
      return;
    }

    // Add new member
    session.members.push({
      id: userId,
      name: userName,
      joinedAt: new Date()
    });
    session.lastActivity = new Date();

    console.log(`[Collab] ${userName} joined session ${code}`);

    res.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        description: session.description,
        mood: session.mood,
        members: session.members,
        prompts: session.prompts,
        messages: session.messages,
        tracks: session.tracks,
        maxMembers: session.maxMembers,
        creatorName: session.creatorName
      }
    });
  } catch (error: any) {
    console.error('[Collab] Join error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add a prompt to the session
router.post('/prompt', (req: Request, res: Response): void => {
  try {
    const { code, userId, userName, text } = req.body;

    if (!code || !userId || !text) {
      res.status(400).json({
        success: false,
        error: 'Code, userId, and text are required'
      });
      return;
    }

    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    // Check if user is a member
    const isMember = session.members.some(m => m.id === userId);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: 'You are not a member of this session'
      });
      return;
    }

    // Add prompt
    session.prompts.push({
      userId,
      userName: userName || 'Unknown',
      text,
      timestamp: new Date()
    });
    session.lastActivity = new Date();

    console.log(`[Collab] Prompt added to ${code}: "${text.substring(0, 50)}..."`);

    res.json({
      success: true,
      prompts: session.prompts
    });
  } catch (error: any) {
    console.error('[Collab] Prompt error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session details
router.get('/session/:code', (req: Request, res: Response): void => {
  try {
    const { code } = req.params;
    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        description: session.description,
        mood: session.mood,
        members: session.members,
        prompts: session.prompts,
        messages: session.messages,
        tracks: session.tracks,
        currentPlaylist: session.currentPlaylist,
        maxMembers: session.maxMembers,
        creatorName: session.creatorName,
        isLive: session.isLive,
        createdAt: session.createdAt
      }
    });
  } catch (error: any) {
    console.error('[Collab] Get session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send a chat message and process with AI to add tracks
router.post('/message', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, userId, userName, text } = req.body;

    if (!code || !userId || !text) {
      res.status(400).json({
        success: false,
        error: 'Code, userId, and text are required'
      });
      return;
    }

    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    // Check if user is a member
    const isMember = session.members.some(m => m.id === userId);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: 'You are not a member of this session'
      });
      return;
    }

    // Add user message
    const userMessage = {
      userId,
      userName: userName || 'Unknown',
      text,
      timestamp: new Date(),
      type: 'message' as const
    };
    session.messages.push(userMessage);
    session.lastActivity = new Date();

    let tracksAdded = false;
    let aiResponse = '';

    // Process message with AI to add tracks
    try {
      const originalPrompt = session.mood || session.description || 'collaborative playlist';
      const currentTrackUris = session.tracks.map(t => t.uri);
      
      // Use AI to parse the refinement request
      const { parseRefinementRequest } = await import('../services/aiService.js');
      const parsedRequest = await parseRefinementRequest(
        originalPrompt,
        text,
        [] // Could extract genres from current tracks
      );

      aiResponse = parsedRequest.explanation || 'Got it!';

      // If action is 'add' or 'adjust', search for tracks
      if (parsedRequest.action === 'add' || parsedRequest.action === 'adjust') {
        const searchResult = await spotifyHandler.searchTracks(parsedRequest.searchQuery, 5);

        if (searchResult.status === 'success' && searchResult.data?.tracks) {
          const newTracks = searchResult.data.tracks
            .filter((t: any) => !currentTrackUris.includes(t.uri))
            .slice(0, 3) // Limit to 3 tracks per message
            .map((track: any) => ({
              name: track.name || 'Unknown',
              artist: track.artists?.[0]?.name || 'Unknown',
              uri: track.uri,
              image: track.album?.images?.[0]?.url,
              addedBy: userName || 'Unknown'
            }));

          if (newTracks.length > 0) {
            session.tracks.push(...newTracks);
            tracksAdded = true;
            aiResponse = `${parsedRequest.explanation} Added ${newTracks.length} track${newTracks.length > 1 ? 's' : ''}! 🎵`;
          } else {
            aiResponse = `${parsedRequest.explanation} All matching tracks are already in the playlist!`;
          }
        } else {
          aiResponse = `Couldn't find tracks matching "${parsedRequest.criteria}". Try being more specific!`;
        }
      } else if (parsedRequest.action === 'remove') {
        aiResponse = `${parsedRequest.explanation} Use the × button on tracks to remove them!`;
      } else {
        aiResponse = parsedRequest.explanation || "I'm ready to help! Tell me what you want to add.";
      }

      // Add AI response as action message
      session.messages.push({
        userId: 'ai',
        userName: 'AI Assistant',
        text: aiResponse,
        timestamp: new Date(),
        type: 'action'
      });
    } catch (aiError: any) {
      console.error('[Collab] AI processing error:', aiError);
      // Still add the user message even if AI fails
      aiResponse = "I'm here to help! Try suggesting a mood or genre like 'chill vibes' or 'upbeat pop'.";
      session.messages.push({
        userId: 'ai',
        userName: 'AI Assistant',
        text: aiResponse,
        timestamp: new Date(),
        type: 'action'
      });
    }

    console.log(`[Collab] Message added to ${code} by ${userName}: "${text.substring(0, 50)}..."`);

    res.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        description: session.description,
        mood: session.mood,
        members: session.members,
        prompts: session.prompts,
        messages: session.messages,
        tracks: session.tracks,
        currentPlaylist: session.currentPlaylist,
        maxMembers: session.maxMembers,
        creatorName: session.creatorName,
        isLive: session.isLive,
        createdAt: session.createdAt
      },
      tracksAdded
    });
  } catch (error: any) {
    console.error('[Collab] Message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove a track from the session
router.post('/remove-track', (req: Request, res: Response): void => {
  try {
    const { code, trackIndex, userId, userName } = req.body;

    if (!code || trackIndex === undefined || !userId) {
      res.status(400).json({
        success: false,
        error: 'Code, trackIndex, and userId are required'
      });
      return;
    }

    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    // Check if user is a member
    const isMember = session.members.some(m => m.id === userId);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: 'You are not a member of this session'
      });
      return;
    }

    // Remove track
    if (trackIndex >= 0 && trackIndex < session.tracks.length) {
      const removedTrack = session.tracks[trackIndex];
      session.tracks.splice(trackIndex, 1);
      session.lastActivity = new Date();

      // Add action message
      session.messages.push({
        userId: userId,
        userName: userName || 'Unknown',
        text: `Removed "${removedTrack.name}" by ${removedTrack.artist}`,
        timestamp: new Date(),
        type: 'action'
      });

      console.log(`[Collab] Track removed from ${code} by ${userName}`);

      res.json({
        success: true,
        session: {
          id: session.id,
          code: session.code,
          name: session.name,
          description: session.description,
          mood: session.mood,
          members: session.members,
          prompts: session.prompts,
          messages: session.messages,
          tracks: session.tracks,
          currentPlaylist: session.currentPlaylist,
          maxMembers: session.maxMembers,
          creatorName: session.creatorName,
          isLive: session.isLive,
          createdAt: session.createdAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid track index'
      });
    }
  } catch (error: any) {
    console.error('[Collab] Remove track error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all live sessions (for discovery)
router.get('/live', (_req: Request, res: Response) => {
  try {
    const liveSessions: any[] = [];
    
    collabSessions.forEach((session) => {
      if (session.isLive && session.members.length < session.maxMembers) {
        liveSessions.push({
          code: session.code,
          name: session.name,
          description: session.description,
          mood: session.mood,
          memberCount: session.members.length,
          maxMembers: session.maxMembers,
          creatorName: session.creatorName,
          promptCount: session.prompts.length,
          createdAt: session.createdAt
        });
      }
    });

    // Sort by most recent
    liveSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      sessions: liveSessions
    });
  } catch (error: any) {
    console.error('[Collab] Live sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// End a session (creator only)
router.post('/end', (req: Request, res: Response): void => {
  try {
    const { code, userId } = req.body;

    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    if (session.creatorId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Only the session creator can end the session'
      });
      return;
    }

    session.isLive = false;
    console.log(`[Collab] Session ${code} ended`);

    res.json({
      success: true,
      message: 'Session ended'
    });
  } catch (error: any) {
    console.error('[Collab] End session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Leave a session
router.post('/leave', (req: Request, res: Response): void => {
  try {
    const { code, userId } = req.body;

    const session = collabSessions.get(code.toUpperCase());

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    // Remove member
    session.members = session.members.filter(m => m.id !== userId);

    // If creator leaves, end session
    if (session.creatorId === userId) {
      session.isLive = false;
    }

    // If no members left, clean up
    if (session.members.length === 0) {
      collabSessions.delete(code.toUpperCase());
    }

    res.json({
      success: true,
      message: 'Left session'
    });
  } catch (error: any) {
    console.error('[Collab] Leave error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
