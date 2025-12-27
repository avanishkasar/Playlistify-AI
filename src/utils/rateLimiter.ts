/**
 * Rate limiter to prevent API abuse
 * Implements token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens = 100, refillRate = 10) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume tokens
   * Returns true if allowed, false if rate limited
   */
  consume(tokens = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    console.warn('Rate limit exceeded', { tokens: this.tokens, requested: tokens });
    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(100, 10); // 100 tokens, refill 10/sec

export default RateLimiter;
