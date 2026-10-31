package com.raahi;

import com.raahi.document.IncidentReport;
import com.raahi.entity.User;
import com.raahi.repository.mongo.IncidentReportRepository;
import com.raahi.service.IncidentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IncidentServiceTest {

    @Mock
    private IncidentReportRepository incidentRepository;

    private IncidentService incidentService;

    @BeforeEach
    void setUp() {
        incidentService = new IncidentService(incidentRepository);
    }

    @Test
    void testCreateIncidentSavesToMongo() {
        User user = new User("Reporter", "rep@example.com", "hash", "1234567890");
        user.setId(7L);

        IncidentReport report = new IncidentReport(
                7L, "Reporter", "Theft", "Lost Wallet", "Stolen near market", "Pune Market", 18.52, 73.85
        );

        when(incidentRepository.save(any(IncidentReport.class))).thenReturn(report);

        IncidentReport saved = incidentService.createIncident(user, report);
        assertNotNull(saved);
        assertEquals("Theft", saved.getType());
        assertEquals("Open", saved.getStatus());
        verify(incidentRepository, times(1)).save(any(IncidentReport.class));
    }

    @Test
    void testToggleIncidentStatus() {
        User user = new User("Reporter", "rep@example.com", "hash", "1234567890");
        user.setId(7L);

        IncidentReport existing = new IncidentReport(7L, "Reporter", "Scam", "Taxi overcharge", "Details", "Station", 18.52, 73.85);
        existing.setId("inc-123");
        existing.setStatus("Open");

        when(incidentRepository.findById("inc-123")).thenReturn(Optional.of(existing));
        when(incidentRepository.save(any(IncidentReport.class))).thenAnswer(inv -> inv.getArgument(0));

        IncidentReport updated = incidentService.toggleStatus(user, "inc-123");
        assertEquals("Resolved", updated.getStatus());
    }
}

