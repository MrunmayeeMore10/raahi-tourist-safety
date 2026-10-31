package com.raahi;

import com.raahi.dto.AuthResponse;
import com.raahi.dto.LoginRequest;
import com.raahi.dto.RegisterRequest;
import com.raahi.entity.User;
import com.raahi.exception.DuplicateResourceException;
import com.raahi.exception.UnauthorizedException;
import com.raahi.repository.sql.UserRepository;
import com.raahi.security.JwtTokenProvider;
import com.raahi.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider tokenProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        tokenProvider = new JwtTokenProvider(
                "RaahiTouristSafetySuperSecureJwtSecretKeyMustBeAtLeast256BitsLongForHmacSha256Security1234567890",
                86400000L
        );
        authService = new AuthService(userRepository, passwordEncoder, tokenProvider);
    }

    @Test
    void testSuccessfulRegistration() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test Traveler");
        req.setEmail("traveler@example.com");
        req.setPassword("securePassword123");
        req.setPhone("9876543210");

        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(101L);
            return u;
        });

        AuthResponse resp = authService.register(req);

        assertTrue(resp.isSuccess());
        assertNotNull(resp.getToken());
        assertEquals("traveler@example.com", resp.getUser().get("email"));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testDuplicateRegistrationThrowsException() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Duplicate User");
        req.setEmail("existing@example.com");
        req.setPassword("password123");

        when(userRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testSuccessfulLogin() {
        User user = new User("John Doe", "john@example.com", passwordEncoder.encode("myPassword123"), "9876543210");
        user.setId(5L);

        when(userRepository.findByEmailIgnoreCase("john@example.com")).thenReturn(Optional.of(user));

        LoginRequest req = new LoginRequest("john@example.com", "myPassword123");
        AuthResponse resp = authService.login(req);

        assertTrue(resp.isSuccess());
        assertNotNull(resp.getToken());
        assertEquals("John Doe", resp.getUser().get("name"));
    }

    @Test
    void testLoginWithInvalidPasswordThrowsUnauthorized() {
        User user = new User("Jane Doe", "jane@example.com", passwordEncoder.encode("correctPass123"), "9876543210");
        user.setId(6L);

        when(userRepository.findByEmailIgnoreCase("jane@example.com")).thenReturn(Optional.of(user));

        LoginRequest req = new LoginRequest("jane@example.com", "wrongPassword");
        assertThrows(UnauthorizedException.class, () -> authService.login(req));
    }

    @Test
    void testPasswordIsHashedAndNotStoredPlaintext() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Hash Test");
        req.setEmail("hash@example.com");
        req.setPassword("plaintextPassword");

        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            assertNotEquals("plaintextPassword", u.getPassword());
            assertTrue(passwordEncoder.matches("plaintextPassword", u.getPassword()));
            u.setId(99L);
            return u;
        });

        AuthResponse resp = authService.register(req);
        assertTrue(resp.isSuccess());
        // Verify response map does not leak the password
        assertFalse(resp.getUser().containsKey("password"));
    }
}

