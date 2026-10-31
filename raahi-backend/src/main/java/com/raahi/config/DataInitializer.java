package com.raahi.config;

import com.raahi.document.LocationSafety;
import com.raahi.entity.EmergencyContact;
import com.raahi.entity.SavedPlace;
import com.raahi.entity.User;
import com.raahi.repository.mongo.LocationSafetyRepository;
import com.raahi.repository.sql.EmergencyContactRepository;
import com.raahi.repository.sql.SavedPlaceRepository;
import com.raahi.repository.sql.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmergencyContactRepository contactRepository;
    private final SavedPlaceRepository placeRepository;
    private final LocationSafetyRepository locationSafetyRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           EmergencyContactRepository contactRepository,
                           SavedPlaceRepository placeRepository,
                           LocationSafetyRepository locationSafetyRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.contactRepository = contactRepository;
        this.placeRepository = placeRepository;
        this.locationSafetyRepository = locationSafetyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        initDefaultUserAndData();
        initMongoSafetyData();
    }

    private void initDefaultUserAndData() {
        if (!userRepository.existsByEmailIgnoreCase("demo@raahi.app")) {
            User demo = new User();
            demo.setName("Demo User");
            demo.setUsername("demo");
            demo.setEmail("demo@raahi.app");
            demo.setPassword(passwordEncoder.encode("demo123"));
            demo.setPhone("9876543210");
            demo.setPhoneCode("+91");
            demo.setCountry("India");
            demo.setAddress("123 Demo Street, Mumbai, Maharashtra 400001");
            demo.setEmergencyContactPhone("9876543211");
            demo.setEmgCode("+91");
            demo.setMedicalNotes("No known allergies. Blood Group O+");
            demo.setGender("Prefer not to say");
            demo.setIdType("Passport");

            User saved = userRepository.save(demo);

            // Default emergency contact
            EmergencyContact contact = new EmergencyContact(
                    saved.getId(),
                    "National Emergency Center",
                    "112",
                    "Official Dispatch",
                    true
            );
            contactRepository.save(contact);

            // Default saved place
            SavedPlace hotel = new SavedPlace(
                    saved.getId(),
                    "Traveler Base Hotel",
                    "Hotel",
                    "Safe central district accommodation",
                    18.5204,
                    73.8567
            );
            placeRepository.save(hotel);
        }
    }

    private void initMongoSafetyData() {
        if (locationSafetyRepository.count() == 0) {
            List<LocationSafety> defaults = new ArrayList<>();

            // Tokyo
            LocationSafety tokyo = new LocationSafety();
            tokyo.setCityKey("tokyo");
            tokyo.setCity("Tokyo");
            tokyo.setCountry("Japan");
            tokyo.setFlag("🇯🇵");
            tokyo.setOverallScore(94);
            tokyo.setDaySafety(97);
            tokyo.setNightSafety(92);
            tokyo.setVerdict("Safe / Benchmark Urban Security");
            tokyo.setVerdictLevel("safe");
            tokyo.setWomenSafety("Exceptional — Tokyo Metro features dedicated women-only coaches during rush hours.");
            tokyo.setSoloTravelerRating("Outstanding — Intuitive multi-lingual navigation and round-the-clock convenience stores.");
            tokyo.setAiSummary("Tokyo is globally recognized as one of the safest capitals in the world. Street violent crime is exceptionally rare.");
            tokyo.setFlaggedReasons(List.of(
                    "Nightlife drink-spiking warnings from unlicensed bar touts in Roppongi and Kabukicho.",
                    "Seismic preparedness guidelines recommend saving local emergency maps offline."
            ));
            tokyo.setTipsAndRisks(Map.of(
                    "transport", "Clean and punctual public rail network. Official taxis are metered and safe.",
                    "scamsAndAreas", "Decline aggressive street touts offering cheap club drinks.",
                    "habits", "Keep phone silenced on commuter trains and maintain basic manners."
            ));
            tokyo.setEmergencyNumbers(Map.of("police", "110", "ambulance", "119", "general", "110 / 119"));
            defaults.add(tokyo);

            // Paris
            LocationSafety paris = new LocationSafety();
            paris.setCityKey("paris");
            paris.setCity("Paris");
            paris.setCountry("France");
            paris.setFlag("🇫🇷");
            paris.setOverallScore(68);
            paris.setDaySafety(82);
            paris.setNightSafety(58);
            paris.setVerdict("Moderately Safe / Active Caution");
            paris.setVerdictLevel("moderate");
            paris.setWomenSafety("Moderate to Good — Well-trafficked central corridors are safe. Exercise caution near Gare du Nord late at night.");
            paris.setSoloTravelerRating("Very Good — Excellent walkability with standard vigilance against pickpockets.");
            paris.setAiSummary("Paris is iconic and rich with culture. Central zones are heavily patrolled, but travelers must guard against pickpocketing near major landmarks.");
            paris.setFlaggedReasons(List.of(
                    "Active pickpocket syndicates near the Eiffel Tower, Louvre Museum, and on Metro Line 1.",
                    "Civil union demonstrations and transit strikes occasionally impacting RER and metro connections."
            ));
            paris.setTipsAndRisks(Map.of(
                    "transport", "Fast Metro and RER lines. Keep phones gripped away from closing train doors.",
                    "scamsAndAreas", "Beware of fake petition clipboards and friendship bracelet scammers near Montmartre.",
                    "habits", "Use crossbody bags with zippers facing inward at open bistro tables."
            ));
            paris.setEmergencyNumbers(Map.of("police", "17 / 112", "ambulance", "15 / 112", "general", "112"));
            defaults.add(paris);

            // Pune
            LocationSafety pune = new LocationSafety();
            pune.setCityKey("pune");
            pune.setCity("Pune");
            pune.setCountry("India");
            pune.setFlag("🇮🇳");
            pune.setOverallScore(82);
            pune.setDaySafety(88);
            pune.setNightSafety(74);
            pune.setVerdict("Safe / Educational & Tech Hub");
            pune.setVerdictLevel("safe");
            pune.setWomenSafety("High — Celebrated as a welcoming student city with Damini women's safety patrol marshals.");
            pune.setSoloTravelerRating("Very Good — Vibrant cafe culture, abundant rideshare options, and helpful locals.");
            pune.setAiSummary("Pune is consistently ranked among India's most livable and peaceful cities. Violent crime against visitors is rare.");
            pune.setFlaggedReasons(List.of(
                    "Crowded traditional markets (Tulshibaug and Laxmi Road) require standard purse protection.",
                    "Erratic road traffic and limited pedestrian zebra crossings on arterial roads."
            ));
            pune.setTipsAndRisks(Map.of(
                    "transport", "Use app-based auto and cab services (Uber, Ola) or Pune Metro.",
                    "scamsAndAreas", "Avoid unmetered roadside auto-rickshaws late at night.",
                    "habits", "Dress respectfully when touring historical wadas or temples."
            ));
            pune.setEmergencyNumbers(Map.of("police", "112 / 100", "ambulance", "108", "general", "112"));
            defaults.add(pune);

            locationSafetyRepository.saveAll(defaults);
        }
    }
}

