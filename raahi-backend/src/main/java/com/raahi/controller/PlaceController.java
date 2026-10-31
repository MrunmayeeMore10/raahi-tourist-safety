package com.raahi.controller;

import com.raahi.dto.ApiResponse;
import com.raahi.entity.SavedPlace;
import com.raahi.entity.User;
import com.raahi.service.PlaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceService placeService;

    public PlaceController(PlaceService placeService) {
        this.placeService = placeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SavedPlace>>> getPlaces(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(placeService.getUserPlaces(user)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SavedPlace>> addPlace(@AuthenticationPrincipal User user,
                                                            @RequestBody SavedPlace place) {
        SavedPlace saved = placeService.savePlace(user, place);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Place saved successfully", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePlace(@AuthenticationPrincipal User user,
                                                         @PathVariable Long id) {
        boolean deleted = placeService.deletePlace(user, id);
        if (deleted) {
            return ResponseEntity.ok(ApiResponse.ok("Place deleted", null));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Place not found"));
    }
}

