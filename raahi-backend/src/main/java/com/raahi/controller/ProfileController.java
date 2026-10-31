package com.raahi.controller;

import com.raahi.dto.ApiResponse;
import com.raahi.dto.ProfileUpdateRequest;
import com.raahi.entity.User;
import com.raahi.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.getProfile(user)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMyProfile(@AuthenticationPrincipal User user,
                                                                             @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully", profileService.updateProfile(user, request)));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfileById(@AuthenticationPrincipal User user,
                                                                           @PathVariable Long userId) {
        // Enforce user-data access restriction: only allow user to access their own profile
        return ResponseEntity.ok(ApiResponse.ok(profileService.getProfile(user)));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfileById(@AuthenticationPrincipal User user,
                                                                              @PathVariable Long userId,
                                                                              @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully", profileService.updateProfile(user, request)));
    }
}

