package com.raahi.security;

import com.raahi.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(String secret, long expirationMs) {
        this(secret, expirationMs, null);
    }

    @Autowired
    public JwtTokenProvider(@Value("${raahi.jwt.secret:}") String secret,
                            @Value("${raahi.jwt.expiration-ms:86400000}") long expirationMs,
                            Environment env) {
        this.expirationMs = expirationMs;

        boolean isProduction = env != null && (
                Arrays.asList(env.getActiveProfiles()).contains("prod") ||
                Arrays.asList(env.getActiveProfiles()).contains("production")
        );

        if (secret == null || secret.trim().isEmpty() || secret.trim().length() < 32) {
            if (isProduction) {
                throw new IllegalStateException("CRITICAL SECURITY VIOLATION: 'JWT_SECRET' environment variable must be explicitly configured and be at least 32 characters (256 bits) long in production!");
            }
            log.warn("⚠️ SECURITY NOTICE: No 256-bit+ JWT_SECRET provided. Generating a cryptographically secure ephemeral HS512 key for local runtime.");
            this.key = Jwts.SIG.HS512.key().build();
        } else {
            this.key = Keys.hmacShaKeyFor(secret.trim().getBytes(StandardCharsets.UTF_8));
        }
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("name", user.getName())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Object userIdObj = claims.get("userId");
        if (userIdObj instanceof Number) {
            return ((Number) userIdObj).longValue();
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
