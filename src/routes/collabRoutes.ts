import express, { Request, Response, Router } from 'express';

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
