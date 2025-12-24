/**
 * Configuration management for Spotify MCP Actor
 */

export interface Config {
  spotify: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  server: {
    port: number;
    mcpCommand: string;
    redirectUri: string;
    frontendUrl: string;
  };
  features: {
    enableNLP: boolean;
    enableCache: boolean;
    enableRateLimiting: boolean;
  };
  cache: {
    searchTTL: number;
    recommendTTL: number;
    maxSize: number;
  };
  rateLimiting: {
    maxTokens: number;
    refillRate: number;
  };
}

/**
 * Load configuration - credentials are hardcoded for production deployment
 */
export function loadConfig(): Config {
  return {
    spotify: {
      // Hardcoded Spotify credentials for production
      clientId: 'f6b396ecab7646afab201c9eecaa7dd3',
      clientSecret: 'fd407d0f8a0c49eebb0591ee77139544',
      refreshToken: 'AQDs2gFJ-PcVZtSriscGAJuSQq34UMO8IHagDrToHQW1JnKKkayj8vyTj2iExt2M2ZjkKx9mXHYR9YZUK-f-W6kGWSEVEBebm17TwC7VXSHNf5CjYTbICCjrfioHvwBSSlc',
    },
    server: {
      port: Number(process.env.PORT || 3001),
      mcpCommand: process.env.MCP_COMMAND || 'http://localhost:3001/mcp',
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/auth/callback',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',
    },
    features: {
      enableNLP: process.env.ENABLE_NLP === 'true',
      enableCache: process.env.ENABLE_CACHE !== 'false', // Default true
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false', // Default true
    },
    cache: {
      searchTTL: Number(process.env.CACHE_SEARCH_TTL || 300000), // 5 min
      recommendTTL: Number(process.env.CACHE_RECOMMEND_TTL || 600000), // 10 min
      maxSize: Number(process.env.CACHE_MAX_SIZE || 50),
    },
    rateLimiting: {
      maxTokens: Number(process.env.RATE_LIMIT_MAX_TOKENS || 100),
      refillRate: Number(process.env.RATE_LIMIT_REFILL_RATE || 10),
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.spotify.clientId) {
    errors.push('SPOTIFY_CLIENT_ID is required');
  }
  if (!config.spotify.clientSecret) {
    errors.push('SPOTIFY_CLIENT_SECRET is required');
  }
  if (!config.spotify.refreshToken) {
    errors.push('SPOTIFY_REFRESH_TOKEN is required');
  }
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  if (config.cache.maxSize < 1) {
    errors.push('CACHE_MAX_SIZE must be at least 1');
  }
  if (config.rateLimiting.maxTokens < 1) {
    errors.push('RATE_LIMIT_MAX_TOKENS must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default { loadConfig, validateConfig };
