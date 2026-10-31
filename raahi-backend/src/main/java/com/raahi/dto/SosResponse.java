package com.raahi.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class SosResponse {
    private boolean recorded;
    private String eventCode;
    private String status;
    private String message;
    private LocalDateTime timestamp;
    private Double latitude;
    private Double longitude;
    private Map<String, String> emergencyHotlines;

    public SosResponse() {}

    public SosResponse(boolean recorded, String eventCode, String status, String message,
                       LocalDateTime timestamp, Double latitude, Double longitude,
                       Map<String, String> emergencyHotlines) {
        this.recorded = recorded;
        this.eventCode = eventCode;
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.emergencyHotlines = emergencyHotlines;
    }

    public boolean isRecorded() { return recorded; }
    public void setRecorded(boolean recorded) { this.recorded = recorded; }

    public String getEventCode() { return eventCode; }
    public void setEventCode(String eventCode) { this.eventCode = eventCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Map<String, String> getEmergencyHotlines() { return emergencyHotlines; }
    public void setEmergencyHotlines(Map<String, String> emergencyHotlines) { this.emergencyHotlines = emergencyHotlines; }
}

