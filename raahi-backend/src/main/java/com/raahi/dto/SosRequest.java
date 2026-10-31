package com.raahi.dto;

public class SosRequest {
    private Double latitude;
    private Double longitude;
    private Double accuracy;
    private String notes;

    public SosRequest() {}

    public SosRequest(Double latitude, Double longitude, Double accuracy) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
    }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getAccuracy() { return accuracy; }
    public void setAccuracy(Double accuracy) { this.accuracy = accuracy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}

