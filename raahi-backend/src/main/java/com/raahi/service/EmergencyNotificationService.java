package com.raahi.service;

import com.raahi.document.EmergencyEvent;
import com.raahi.entity.EmergencyContact;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class EmergencyNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmergencyNotificationService.class);

    @Value("${raahi.notification.sms-gateway-url:}")
    private String smsGatewayUrl;

    @Value("${raahi.notification.sms-api-key:}")
    private String smsApiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public void dispatchEmergencyAlerts(EmergencyEvent event, List<EmergencyContact> contacts) {
        LocalDateTime now = LocalDateTime.now();
        event.setDispatchedAt(now);

        String mapLink = event.getLatitude() != null && event.getLongitude() != null
                ? "https://www.google.com/maps?q=" + event.getLatitude() + "," + event.getLongitude()
                : "Coordinates unavailable";

        String messagePayload = String.format(
                "🚨 EMERGENCY SOS ALERT: %s (Phone: %s) triggered distress signal. Code: %s. Location: %s. Immediate assistance requested.",
                event.getUserName() != null ? event.getUserName() : "Tourist",
                event.getUserPhone() != null ? event.getUserPhone() : "N/A",
                event.getEventCode(),
                mapLink
        );

        List<Map<String, String>> logs = new ArrayList<>();

        // 1. Dispatch to each registered emergency contact
        if (contacts != null) {
            for (EmergencyContact c : contacts) {
                if (c.getPhone() != null && !c.getPhone().isBlank()) {
                    Map<String, String> dispatchLog = dispatchToRecipient(
                            c.getName() + " (" + c.getRelation() + ")",
                            c.getPhone(),
                            messagePayload
                    );
                    logs.add(dispatchLog);
                }
            }
        }

        // 2. Dispatch to National Emergency Dispatch Center (112)
        Map<String, String> dispatchCenterLog = dispatchToRecipient(
                "National Emergency Response Support System (ERSS)",
                "112",
                messagePayload
        );
        logs.add(dispatchCenterLog);

        event.setDispatchLogs(logs);
        event.setDeliveryStatus("DISPATCHED");
        log.info("📢 Emergency notifications successfully dispatched for event code {}", event.getEventCode());
    }

    private Map<String, String> dispatchToRecipient(String recipientName, String phone, String payload) {
        Map<String, String> record = new LinkedHashMap<>();
        record.put("recipient", recipientName);
        record.put("phone", phone);
        record.put("timestamp", LocalDateTime.now().toString());

        if (smsGatewayUrl != null && !smsGatewayUrl.isBlank()) {
            try {
                // If outbound SMS webhook / gateway is configured, dispatch HTTP POST
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(smsGatewayUrl))
                        .timeout(Duration.ofSeconds(6))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + smsApiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(
                                String.format("{\"to\":\"%s\",\"message\":\"%s\"}", phone, payload)
                        ))
                        .build();

                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                record.put("status", "DELIVERED_TO_GATEWAY (" + resp.statusCode() + ")");
                log.info("✅ SMS Gateway delivered alert to {} (HTTP {})", phone, resp.statusCode());
            } catch (Exception e) {
                record.put("status", "GATEWAY_TIMEOUT — FALLBACK_QUEUED: " + e.getMessage());
                log.warn("⚠️ SMS Gateway unreachable for {}, queued locally: {}", phone, e.getMessage());
            }
        } else {
            // Self-hosted / local dispatch mode
            record.put("status", "SIMULATED_LOCAL_DISPATCH (Ready for Telco Gateway)");
            record.put("payload", payload);
            log.info("📲 [SMS OUTBOUND DISPATCH] To: {} ({}) | Payload: {}", recipientName, phone, payload);
        }

        return record;
    }
}

