package com.raahi.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "location_safety")
public class LocationSafety {

    @Id
    private String id;

    @Indexed(unique = true)
    private String cityKey;

    private String city;
    private String country;
    private String flag;

    private Boolean verified = true;

    private Integer overallScore;
    private Integer daySafety;
    private Integer nightSafety;

    private String verdict;
    private String verdictLevel; // safe, moderate, caution, unverified
    private String womenSafety;
    private String soloTravelerRating;
    private String aiSummary;

    private List<String> flaggedReasons = new ArrayList<>();
    private List<Map<String, Object>> recentNews = new ArrayList<>();
    private Map<String, String> tipsAndRisks = new HashMap<>();
    private Map<String, String> emergencyNumbers = new HashMap<>();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public LocationSafety() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCityKey() { return cityKey; }
    public void setCityKey(String cityKey) { this.cityKey = cityKey; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getFlag() { return flag; }
    public void setFlag(String flag) { this.flag = flag; }

    public Boolean getVerified() { return verified; }
    public void setVerified(Boolean verified) { this.verified = verified; }

    public Integer getOverallScore() { return overallScore; }
    public void setOverallScore(Integer overallScore) { this.overallScore = overallScore; }

    public Integer getDaySafety() { return daySafety; }
    public void setDaySafety(Integer daySafety) { this.daySafety = daySafety; }

    public Integer getNightSafety() { return nightSafety; }
    public void setNightSafety(Integer nightSafety) { this.nightSafety = nightSafety; }

    public String getVerdict() { return verdict; }
    public void setVerdict(String verdict) { this.verdict = verdict; }

    public String getVerdictLevel() { return verdictLevel; }
    public void setVerdictLevel(String verdictLevel) { this.verdictLevel = verdictLevel; }

    public String getWomenSafety() { return womenSafety; }
    public void setWomenSafety(String womenSafety) { this.womenSafety = womenSafety; }

    public String getSoloTravelerRating() { return soloTravelerRating; }
    public void setSoloTravelerRating(String soloTravelerRating) { this.soloTravelerRating = soloTravelerRating; }

    public String getAiSummary() { return aiSummary; }
    public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }

    public List<String> getFlaggedReasons() { return flaggedReasons; }
    public void setFlaggedReasons(List<String> flaggedReasons) { this.flaggedReasons = flaggedReasons; }

    public List<Map<String, Object>> getRecentNews() { return recentNews; }
    public void setRecentNews(List<Map<String, Object>> recentNews) { this.recentNews = recentNews; }

    public Map<String, String> getTipsAndRisks() { return tipsAndRisks; }
    public void setTipsAndRisks(Map<String, String> tipsAndRisks) { this.tipsAndRisks = tipsAndRisks; }

    public Map<String, String> getEmergencyNumbers() { return emergencyNumbers; }
    public void setEmergencyNumbers(Map<String, String> emergencyNumbers) { this.emergencyNumbers = emergencyNumbers; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
