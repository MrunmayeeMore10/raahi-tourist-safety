package com.raahi.service;

import com.raahi.document.EmergencyEvent;
import com.raahi.dto.SosRequest;
import com.raahi.dto.SosResponse;
import com.raahi.entity.EmergencyContact;
import com.raahi.entity.User;
import com.raahi.repository.mongo.EmergencyEventRepository;
import com.raahi.repository.sql.EmergencyContactRepository;
import com.raahi.repository.sql.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class EmergencyService {

    private final EmergencyEventRepository emergencyEventRepository;
    private final EmergencyContactRepository contactRepository;
    private final UserRepository userRepository;
    private final EmergencyNotificationService emergencyNotificationService;

    public EmergencyService(EmergencyEventRepository emergencyEventRepository,
                            EmergencyContactRepository contactRepository,
                            UserRepository userRepository,
                            EmergencyNotificationService emergencyNotificationService) {
        this.emergencyEventRepository = emergencyEventRepository;
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
        this.emergencyNotificationService = emergencyNotificationService;
    }

    public SosResponse triggerSos(User user, SosRequest request) {
        // If not authenticated, try finding demo user or fallback
        User effectiveUser = user;
        if (effectiveUser == null) {
            effectiveUser = userRepository.findByEmailIgnoreCase("demo@raahi.app").orElse(null);
        }

        Long userId = effectiveUser != null ? effectiveUser.getId() : 0L;
        String userName = effectiveUser != null ? effectiveUser.getName() : "Tourist (Emergency SOS)";
        String userPhone = effectiveUser != null ? effectiveUser.getPhone() : "N/A";

        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String eventCode = "SOS-" + datePart + "-" + randomSuffix;

        Double lat = request != null ? request.getLatitude() : null;
        Double lon = request != null ? request.getLongitude() : null;
        Double acc = request != null ? request.getAccuracy() : null;

        EmergencyEvent event = new EmergencyEvent(
                eventCode,
                userId,
                userName,
                userPhone,
                lat,
                lon,
                acc
        );

        if (request != null && request.getNotes() != null) {
            event.setNotes(request.getNotes());
        }

        // Gather user's saved emergency contacts from SQL if available
        List<String> notified = new ArrayList<>();
        List<EmergencyContact> contacts = Collections.emptyList();
        if (userId != 0L) {
            contacts = contactRepository.findByUserIdOrderByIsPrimaryDescCreatedAtAsc(userId);
            for (EmergencyContact c : contacts) {
                if (c.getPhone() != null && !c.getPhone().isBlank()) {
                    notified.add(c.getName() + " (" + c.getPhone() + ")");
                }
            }
        }
        if (notified.isEmpty()) {
            notified.add("National Emergency Dispatch (112)");
        }
        event.setContactsNotified(notified);

        // Execute automated emergency dispatch to contacts & response center
        if (emergencyNotificationService != null) {
            emergencyNotificationService.dispatchEmergencyAlerts(event, contacts);
        }

        // Save document in MongoDB with full dispatch audit logs
        EmergencyEvent saved = emergencyEventRepository.save(event);

        Map<String, String> hotlines = new LinkedHashMap<>();
        hotlines.put("police", "112");
        hotlines.put("ambulance", "108");
        hotlines.put("fire", "101");
        hotlines.put("touristHelpline", "1363");

        return new SosResponse(
                true,
                saved.getEventCode(),
                saved.getStatus(),
                "SOS distress registered. Automated alerts dispatched to your emergency contacts and national dispatch.",
                saved.getTimestamp(),
                saved.getLatitude(),
                saved.getLongitude(),
                hotlines
        );
    }

    public List<EmergencyEvent> getUserEmergencyEvents(User user) {
        if (user == null) {
            return Collections.emptyList();
        }
        return emergencyEventRepository.findByUserIdOrderByTimestampDesc(user.getId());
    }
}
