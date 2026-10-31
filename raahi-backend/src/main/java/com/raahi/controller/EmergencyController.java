package com.raahi.controller;

import com.raahi.document.EmergencyEvent;
import com.raahi.dto.ApiResponse;
import com.raahi.dto.SosRequest;
import com.raahi.dto.SosResponse;
import com.raahi.entity.User;
import com.raahi.service.EmergencyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    private final EmergencyService emergencyService;

    public EmergencyController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    @PostMapping("/sos")
    public ResponseEntity<ApiResponse<SosResponse>> triggerSos(@AuthenticationPrincipal User user,
                                                               @RequestBody(required = false) SosRequest request) {
        SosResponse response = emergencyService.triggerSos(user, request != null ? request : new SosRequest());
        return ResponseEntity.ok(ApiResponse.ok("Emergency event registered", response));
    }

    @GetMapping("/my-events")
    public ResponseEntity<ApiResponse<List<EmergencyEvent>>> getMyEvents(@AuthenticationPrincipal User user) {
        List<EmergencyEvent> events = emergencyService.getUserEmergencyEvents(user);
        return ResponseEntity.ok(ApiResponse.ok(events));
    }
}

