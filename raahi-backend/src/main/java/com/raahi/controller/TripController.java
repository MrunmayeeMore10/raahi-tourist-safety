package com.raahi.controller;

import com.raahi.dto.ApiResponse;
import com.raahi.entity.Trip;
import com.raahi.entity.User;
import com.raahi.service.TripService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Trip>>> getTrips(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(tripService.getUserTrips(user)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Trip>> saveTrip(@AuthenticationPrincipal User user,
                                                      @RequestBody Trip trip) {
        Trip saved = tripService.saveTrip(user, trip);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Trip saved", saved));
    }

    @PostMapping("/{id}/checkin")
    public ResponseEntity<ApiResponse<Trip>> checkIn(@AuthenticationPrincipal User user,
                                                     @PathVariable Long id) {
        Trip updated = tripService.checkIn(user, id);
        return ResponseEntity.ok(ApiResponse.ok("Safety check-in recorded successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTrip(@AuthenticationPrincipal User user,
                                                        @PathVariable Long id) {
        boolean deleted = tripService.deleteTrip(user, id);
        if (deleted) {
            return ResponseEntity.ok(ApiResponse.ok("Trip deleted", null));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Trip not found"));
    }
}

