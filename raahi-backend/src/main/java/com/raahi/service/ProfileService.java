package com.raahi.service;

import com.raahi.dto.ProfileUpdateRequest;
import com.raahi.entity.User;
import com.raahi.exception.ResourceNotFoundException;
import com.raahi.repository.sql.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UserRepository userRepository,
                          AuthService authService,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> getProfile(User user) {
        User fresh = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + user.getId()));
        return authService.toSafeUserMap(fresh);
    }

    @Transactional
    public Map<String, Object> updateProfile(User user, ProfileUpdateRequest req) {
        User existing = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + user.getId()));

        if (req.getName() != null && !req.getName().isBlank()) existing.setName(req.getName().trim());
        if (req.getUsername() != null && !req.getUsername().isBlank()) existing.setUsername(req.getUsername().trim());
        if (req.getPhone() != null) existing.setPhone(req.getPhone().trim());
        if (req.getPhoneCode() != null) existing.setPhoneCode(req.getPhoneCode());
        if (req.getGender() != null) existing.setGender(req.getGender());
        if (req.getCountry() != null) existing.setCountry(req.getCountry());
        if (req.getAddress() != null) existing.setAddress(req.getAddress());
        if (req.getEmergency() != null) existing.setEmergencyContactPhone(req.getEmergency());
        if (req.getEmgCode() != null) existing.setEmgCode(req.getEmgCode());
        if (req.getMedical() != null) existing.setMedicalNotes(req.getMedical());
        if (req.getIdType() != null) existing.setIdType(req.getIdType());
        if (req.getPhoto() != null && !req.getPhoto().isBlank()) existing.setPhotoUrl(req.getPhoto());

        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        User saved = userRepository.save(existing);
        return authService.toSafeUserMap(saved);
    }
}

