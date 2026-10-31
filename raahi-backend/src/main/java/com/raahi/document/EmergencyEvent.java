package com.raahi.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Document(collection = "emergency_events")
public class EmergencyEvent {

    @Id
    private String id;

    @Indexed(unique = true)
    private String eventCode;

    @Indexed
    private Long userId;

    private String userName;
    private String userPhone;
    private Double latitude;
    private Double longitude;
    private Double accuracy;

    private String status = "ACTIVE"; // ACTIVE, RESPONDING, RESOLVED
    private String emergencyServices = "POLICE_112,HOSPITAL_108";
    private List<String> contactsNotified = new ArrayList<>();
    private String notes;

    // Automated Notification Audit Fields
    private String deliveryStatus = "DISPATCHED"; // PENDING, DISPATCHED, DELIVERED, SIMULATED
    private LocalDateTime dispatchedAt;
    private List<Map<String, String>> dispatchLogs = new ArrayList<>();

    @Indexed
    private LocalDateTime timestamp = LocalDateTime.now();

    public EmergencyEvent() {}

    public EmergencyEvent(String eventCode, Long userId, String userName, String userPhone,
                          Double latitude, Double longitude, Double accuracy) {
        this.eventCode = eventCode;
        this.userId = userId;
        this.userName = userName;
        this.userPhone = userPhone;
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
        this.status = "ACTIVE";
        this.timestamp = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEventCode() { return eventCode; }
    public void setEventCode(String eventCode) { this.eventCode = eventCode; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserPhone() { return userPhone; }
    public void setUserPhone(String userPhone) { this.userPhone = userPhone; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getAccuracy() { return accuracy; }
    public void setAccuracy(Double accuracy) { this.accuracy = accuracy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getEmergencyServices() { return emergencyServices; }
    public void setEmergencyServices(String emergencyServices) { this.emergencyServices = emergencyServices; }

    public List<String> getContactsNotified() { return contactsNotified; }
    public void setContactsNotified(List<String> contactsNotified) { this.contactsNotified = contactsNotified; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; }

    public LocalDateTime getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(LocalDateTime dispatchedAt) { this.dispatchedAt = dispatchedAt; }

    public List<Map<String, String>> getDispatchLogs() { return dispatchLogs; }
    public void setDispatchLogs(List<Map<String, String>> dispatchLogs) { this.dispatchLogs = dispatchLogs; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
