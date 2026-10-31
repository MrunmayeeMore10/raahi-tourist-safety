package com.raahi.service;

import com.raahi.document.IncidentReport;
import com.raahi.entity.User;
import com.raahi.exception.ResourceNotFoundException;
import com.raahi.repository.mongo.IncidentReportRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IncidentService {

    private final IncidentReportRepository incidentRepository;

    public IncidentService(IncidentReportRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    public List<IncidentReport> getUserIncidents(User user) {
        return incidentRepository.findByUserIdOrderByTimestampDesc(user.getId());
    }

    public IncidentReport createIncident(User user, IncidentReport report) {
        report.setId(null);
        report.setUserId(user.getId());
        if (report.getTouristName() == null || report.getTouristName().isBlank()) {
            report.setTouristName(user.getName());
        }
        if (report.getStatus() == null || report.getStatus().isBlank()) {
            report.setStatus("Open");
        }
        return incidentRepository.save(report);
    }

    public IncidentReport toggleStatus(User user, String id) {
        IncidentReport existing = incidentRepository.findById(id)
                .filter(inc -> inc.getUserId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id " + id));

        existing.setStatus("Resolved".equalsIgnoreCase(existing.getStatus()) ? "Open" : "Resolved");
        return incidentRepository.save(existing);
    }

    public boolean deleteIncident(User user, String id) {
        return incidentRepository.findById(id)
                .filter(inc -> inc.getUserId().equals(user.getId()))
                .map(inc -> {
                    incidentRepository.delete(inc);
                    return true;
                }).orElse(false);
    }
}

