package com.raahi.controller;

import com.raahi.document.LocationHistory;
import com.raahi.dto.ApiResponse;
import com.raahi.entity.User;
import com.raahi.service.LocationHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/location-history")
public class LocationHistoryController {

    private final LocationHistoryService locationHistoryService;

    public LocationHistoryController(LocationHistoryService locationHistoryService) {
        this.locationHistoryService = locationHistoryService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LocationHistory>> recordLocation(@AuthenticationPrincipal User user,
                                                                       @RequestBody LocationHistory location) {
        LocationHistory saved = locationHistoryService.recordLocation(user, location);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Location telemetry recorded in MongoDB", saved));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LocationHistory>>> getLocationHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(locationHistoryService.getUserLocationHistory(user)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearLocationHistory(@AuthenticationPrincipal User user) {
        locationHistoryService.clearUserLocationHistory(user);
        return ResponseEntity.ok(ApiResponse.ok("Location history cleared from MongoDB", null));
    }
}

