package com.raahi;

import com.raahi.document.EmergencyEvent;
import com.raahi.dto.SosRequest;
import com.raahi.dto.SosResponse;
import com.raahi.entity.User;
import com.raahi.repository.mongo.EmergencyEventRepository;
import com.raahi.repository.sql.EmergencyContactRepository;
import com.raahi.repository.sql.UserRepository;
import com.raahi.service.EmergencyNotificationService;
import com.raahi.service.EmergencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EmergencyServiceTest {

    @Mock
    private EmergencyEventRepository emergencyEventRepository;

    @Mock
    private EmergencyContactRepository contactRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmergencyNotificationService emergencyNotificationService;

    private EmergencyService emergencyService;

    @BeforeEach
    void setUp() {
        emergencyService = new EmergencyService(emergencyEventRepository, contactRepository, userRepository, emergencyNotificationService);
    }

    @Test
    void testSosTriggerGeneratesUniqueEventCodeAndSavesToMongo() {
        User user = new User("Tourist In Need", "tourist@raahi.app", "hash", "9876543210");
        user.setId(42L);

        SosRequest req = new SosRequest(18.5204, 73.8567, 12.5);
        req.setNotes("Test SOS alert");

        when(contactRepository.findByUserIdOrderByIsPrimaryDescCreatedAtAsc(42L))
                .thenReturn(Collections.emptyList());
        when(emergencyEventRepository.save(any(EmergencyEvent.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SosResponse resp = emergencyService.triggerSos(user, req);

        assertTrue(resp.isRecorded());
        assertNotNull(resp.getEventCode());
        assertTrue(resp.getEventCode().startsWith("SOS-"));
        assertEquals("ACTIVE", resp.getStatus());
        assertEquals(18.5204, resp.getLatitude());
        assertEquals(73.8567, resp.getLongitude());
        assertNotNull(resp.getEmergencyHotlines());
        assertEquals("112", resp.getEmergencyHotlines().get("police"));
        assertEquals("108", resp.getEmergencyHotlines().get("ambulance"));

        verify(emergencyNotificationService, times(1)).dispatchEmergencyAlerts(any(EmergencyEvent.class), anyList());
        verify(emergencyEventRepository, times(1)).save(any(EmergencyEvent.class));
    }
}
