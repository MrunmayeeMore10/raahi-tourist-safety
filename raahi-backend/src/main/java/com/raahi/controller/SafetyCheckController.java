package com.raahi.controller;

import com.raahi.document.LocationSafety;
import com.raahi.dto.ApiResponse;
import com.raahi.service.SafetyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/safety")
public class SafetyCheckController {

    private final SafetyService safetyService;

    public SafetyCheckController(SafetyService safetyService) {
        this.safetyService = safetyService;
    }

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<LocationSafety>> checkLocation(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "city", required = false) String city) {
        String effectiveQuery = query != null && !query.isBlank() ? query : city;
        if (effectiveQuery == null || effectiveQuery.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Query or city parameter is required"));
        }
        LocationSafety result = safetyService.checkCitySafety(effectiveQuery);
        return ResponseEntity.ok(ApiResponse.ok("Safety assessment retrieved from MongoDB", result));
    }

    @GetMapping("/popular")
    public ResponseEntity<ApiResponse<List<LocationSafety>>> getPopularLocations() {
        return ResponseEntity.ok(ApiResponse.ok(safetyService.getAllLocations()));
    }
}

