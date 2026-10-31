package com.raahi.dto;

import java.util.Map;

public class AuthResponse {
    private boolean success;
    private String token;
    private String message;
    private Map<String, Object> user;

    public AuthResponse() {}

    public AuthResponse(boolean success, String token, String message, Map<String, Object> user) {
        this.success = success;
        this.token = token;
        this.message = message;
        this.user = user;
    }

    public static AuthResponse ok(String token, Map<String, Object> user) {
        return new AuthResponse(true, token, "Authentication successful", user);
    }

    public static AuthResponse error(String message) {
        return new AuthResponse(false, null, message, null);
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Map<String, Object> getUser() { return user; }
    public void setUser(Map<String, Object> user) { this.user = user; }
}

