package com.raahi.controller;

import com.raahi.document.IncidentReport;
import com.raahi.dto.ApiResponse;
import com.raahi.entity.User;
import com.raahi.service.IncidentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<IncidentReport>>> getIncidents(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(incidentService.getUserIncidents(user)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IncidentReport>> recordIncident(@AuthenticationPrincipal User user,
                                                                      @RequestBody IncidentReport report) {
        IncidentReport saved = incidentService.createIncident(user, report);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Incident recorded in MongoDB", saved));
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<IncidentReport>> toggleStatus(@AuthenticationPrincipal User user,
                                                                    @PathVariable String id) {
        IncidentReport updated = incidentService.toggleStatus(user, id);
        return ResponseEntity.ok(ApiResponse.ok("Status updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIncident(@AuthenticationPrincipal User user,
                                                            @PathVariable String id) {
        boolean deleted = incidentService.deleteIncident(user, id);
        if (deleted) {
            return ResponseEntity.ok(ApiResponse.ok("Incident deleted", null));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Incident not found"));
    }
}

