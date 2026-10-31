package com.raahi.service;

import com.raahi.dto.AuthResponse;
import com.raahi.dto.LoginRequest;
import com.raahi.dto.RegisterRequest;
import com.raahi.entity.User;
import com.raahi.exception.DuplicateResourceException;
import com.raahi.exception.UnauthorizedException;
import com.raahi.repository.sql.UserRepository;
import com.raahi.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String normalizedEmail = req.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("An account with email " + normalizedEmail + " already exists.");
        }

        User user = new User();
        user.setName(req.getName().trim());
        user.setUsername(req.getUsername() != null && !req.getUsername().isBlank()
                ? req.getUsername().trim()
                : normalizedEmail.split("@")[0]);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(req.getPassword())); // BCrypt hashed
        user.setPhone(req.getPhone());
        user.setPhoneCode(req.getPhoneCode() != null ? req.getPhoneCode() : "+91");
        user.setGender(req.getGender());
        user.setCountry(req.getCountry() != null ? req.getCountry() : "India");
        user.setAddress(req.getAddress());
        user.setEmergencyContactPhone(req.getEmergency());
        user.setEmgCode(req.getEmgCode() != null ? req.getEmgCode() : "+91");
        user.setMedicalNotes(req.getMedical());
        user.setIdType(req.getIdType());
        user.setPhotoUrl(req.getPhoto());

        User saved = userRepository.save(user);
        String token = tokenProvider.generateToken(saved);

        return AuthResponse.ok(token, toSafeUserMap(saved));
    }

    public AuthResponse login(LoginRequest req) {
        String identifier = req.getUsername().trim();
        Optional<User> userOpt = identifier.contains("@")
                ? userRepository.findByEmailIgnoreCase(identifier.toLowerCase())
                : userRepository.findByUsernameIgnoreCase(identifier);

        if (userOpt.isEmpty()) {
            // Also check by name if exact match
            userOpt = userRepository.findAll().stream()
                    .filter(u -> u.getName() != null && u.getName().equalsIgnoreCase(identifier))
                    .findFirst();
        }

        if (userOpt.isEmpty() || !passwordEncoder.matches(req.getPassword(), userOpt.get().getPassword())) {
            throw new UnauthorizedException("Invalid username, email, or password.");
        }

        User user = userOpt.get();
        String token = tokenProvider.generateToken(user);
        return AuthResponse.ok(token, toSafeUserMap(user));
    }

    public Map<String, Object> toSafeUserMap(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("phone", user.getPhone());
        map.put("phoneCode", user.getPhoneCode());
        map.put("gender", user.getGender());
        map.put("country", user.getCountry());
        map.put("address", user.getAddress());
        map.put("emergency", user.getEmergencyContactPhone());
        map.put("emgCode", user.getEmgCode());
        map.put("medical", user.getMedicalNotes());
        map.put("idType", user.getIdType());
        map.put("photo", user.getPhotoUrl());
        map.put("createdAt", user.getCreatedAt().toString());
        return map;
    }
}

