package com.raahi.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @JsonAlias({"email", "identifier", "user", "login"})
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    public LoginRequest() {}

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return username; }
    public void setEmail(String email) {
        if (this.username == null || this.username.isBlank()) {
            this.username = email;
        }
    }

    @AssertTrue(message = "Username or email is required")
    public boolean isIdentifierProvided() {
        return username != null && !username.trim().isEmpty();
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
