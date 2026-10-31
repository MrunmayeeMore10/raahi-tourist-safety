package com.raahi.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "incident_reports")
public class IncidentReport {

    @Id
    private String id;

    @Indexed
    private Long userId;

    private String touristName;
    private String type; // Safety concern, Theft, Harassment, Medical, Scam, SOS
    private String title;
    private String details;
    private String location;
    private Double latitude;
    private Double longitude;

    private String status = "Open"; // Open, Resolved

    @Indexed
    private LocalDateTime timestamp = LocalDateTime.now();

    public IncidentReport() {}

    public IncidentReport(Long userId, String touristName, String type, String title,
                          String details, String location, Double latitude, Double longitude) {
        this.userId = userId;
        this.touristName = touristName;
        this.type = type;
        this.title = title;
        this.details = details;
        this.location = location;
        this.latitude = latitude;
        this.longitude = longitude;
        this.status = "Open";
        this.timestamp = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTouristName() { return touristName; }
    public void setTouristName(String touristName) { this.touristName = touristName; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}

