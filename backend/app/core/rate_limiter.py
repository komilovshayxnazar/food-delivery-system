import time
import redis
import os

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

class TokenBucketRateLimiter:
    """
    R11: From-Scratch System Component
    A Token Bucket rate limiter using Redis as a backend to allow distributed rate limiting.
    """
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate # tokens per second

    def allow_request(self, user_id: str) -> bool:
        key = f"rate_limit:{user_id}"
        
        # We use a simple Lua script for atomicity
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])
        
        if not tokens then
            tokens = capacity
            last_refill = now
        end
        
        local elapsed = now - last_refill
        local new_tokens = elapsed * refill_rate
        tokens = math.min(capacity, tokens + new_tokens)
        
        if tokens >= 1 then
            redis.call('HMSET', key, 'tokens', tokens - 1, 'last_refill', now)
            redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) * 2)
            return 1
        else
            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
            return 0
        end
        """
        now = time.time()
        result = redis_client.eval(lua_script, 1, key, self.capacity, self.refill_rate, now)
        return result == 1

limiter = TokenBucketRateLimiter(capacity=10, refill_rate=1.0)
