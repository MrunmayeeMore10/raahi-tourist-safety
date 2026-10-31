package com.raahi.security;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitingService {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MS = 60_000L; // 60 seconds

    private static class AttemptTracker {
        int count;
        long windowStart;

        AttemptTracker(long now) {
            this.count = 1;
            this.windowStart = now;
        }
    }

    private final Map<String, AttemptTracker> ipAttempts = new ConcurrentHashMap<>();

    /**
     * Checks if the given client identifier (IP address) has exceeded the rate limit.
     * @param clientIp client's IP address
     * @return true if request is allowed, false if rate limit exceeded
     */
    public synchronized boolean tryAcquire(String clientIp) {
        long now = System.currentTimeMillis();
        AttemptTracker tracker = ipAttempts.get(clientIp);

        if (tracker == null || (now - tracker.windowStart) > WINDOW_MS) {
            ipAttempts.put(clientIp, new AttemptTracker(now));
            cleanupStaleEntries(now);
            return true;
        }

        if (tracker.count >= MAX_ATTEMPTS) {
            return false;
        }

        tracker.count++;
        return true;
    }

    /**
     * Resets the attempt counter for an IP address upon successful authentication.
     */
    public void reset(String clientIp) {
        if (clientIp != null) {
            ipAttempts.remove(clientIp);
        }
    }

    private void cleanupStaleEntries(long now) {
        if (ipAttempts.size() > 5000) {
            ipAttempts.entrySet().removeIf(entry -> (now - entry.getValue().windowStart) > WINDOW_MS);
        }
    }
}

