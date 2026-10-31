package com.raahi.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "trips", indexes = {
    @Index(name = "idx_trip_user", columnList = "userId")
})
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    private String destination;
    private String returnAt;

    @Column(length = 2000)
    private String notes;

    private Boolean checkedIn = false;
    private String checkInAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Trip() {}

    public Trip(Long userId, String destination, String returnAt, String notes) {
        this.userId = userId;
        this.destination = destination;
        this.returnAt = returnAt;
        this.notes = notes;
        this.checkedIn = false;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getReturnAt() { return returnAt; }
    public void setReturnAt(String returnAt) { this.returnAt = returnAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Boolean getCheckedIn() { return checkedIn; }
    public void setCheckedIn(Boolean checkedIn) { this.checkedIn = checkedIn; }

    public String getCheckInAt() { return checkInAt; }
    public void setCheckInAt(String checkInAt) { this.checkInAt = checkInAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

