package com.raahi.service;

import com.raahi.document.LocationSafety;
import com.raahi.repository.mongo.LocationSafetyRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SafetyService {

    private final LocationSafetyRepository locationSafetyRepository;

    public SafetyService(LocationSafetyRepository locationSafetyRepository) {
        this.locationSafetyRepository = locationSafetyRepository;
    }

    public List<LocationSafety> getAllLocations() {
        return locationSafetyRepository.findAll();
    }

    public LocationSafety checkCitySafety(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }

        String clean = query.trim().toLowerCase();
        Optional<LocationSafety> found = locationSafetyRepository.findByCityKeyIgnoreCase(clean);
        if (found.isPresent()) {
            return found.get();
        }

        found = locationSafetyRepository.findByCityIgnoreCase(clean);
        if (found.isPresent()) {
            return found.get();
        }

        // Fuzzy match by checking if name contains query
        for (LocationSafety loc : locationSafetyRepository.findAll()) {
            if (loc.getCity() != null && loc.getCity().toLowerCase().contains(clean)) {
                return loc;
            }
        }

        // Generate honest unverified assessment for cities without certified crime telemetry
        LocationSafety unverified = new LocationSafety();
        String formattedName = Character.toUpperCase(clean.charAt(0)) + clean.substring(1).toLowerCase();
        unverified.setCityKey(clean);
        unverified.setCity(formattedName);
        unverified.setCountry("Global Destination");
        unverified.setFlag("🌐");
        unverified.setVerified(false);
        unverified.setOverallScore(null); // Explicitly null rather than an arbitrary numerical score
        unverified.setDaySafety(null);
        unverified.setNightSafety(null);
        unverified.setVerdict("Unverified — Local Advisory Required");
        unverified.setVerdictLevel("unverified");
        unverified.setAiSummary("No verified municipal crime or tourist safety dataset is currently recorded in RAAHI for " + formattedName + ". Do not rely on unverified safety metrics; please consult official government travel advisories and local embassy guidelines before visiting.");
        unverified.setWomenSafety("Unverified — Exercise personal caution and remain in well-lit, populated areas.");
        unverified.setSoloTravelerRating("Advisory — Stay in verified accommodations and register your travel plan.");

        List<String> reasons = new ArrayList<>();
        reasons.add("Pending official crime statistics: Municipal police records and 90-day incident telemetry are not yet registered for this region.");
        reasons.add("Travelers should independently check with local consulates, official tourism boards, or emergency hotlines.");
        unverified.setFlaggedReasons(reasons);

        Map<String, String> tips = new LinkedHashMap<>();
        tips.put("transport", "Use official registered airport or hotel transportation services.");
        tips.put("scamsAndAreas", "Avoid isolated areas at night and keep identification in hotel safe.");
        tips.put("habits", "Save local police and embassy contacts offline before traveling.");
        unverified.setTipsAndRisks(tips);

        Map<String, String> emergencies = new LinkedHashMap<>();
        emergencies.put("police", "112 / Local Police");
        emergencies.put("ambulance", "112 / Local Medical");
        emergencies.put("general", "112 (Universal Emergency)");
        unverified.setEmergencyNumbers(emergencies);

        return unverified;
    }
}

