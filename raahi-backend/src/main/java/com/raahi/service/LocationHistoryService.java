package com.raahi.service;

import com.raahi.document.LocationHistory;
import com.raahi.entity.User;
import com.raahi.repository.mongo.LocationHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationHistoryService {

    private final LocationHistoryRepository locationHistoryRepository;

    public LocationHistoryService(LocationHistoryRepository locationHistoryRepository) {
        this.locationHistoryRepository = locationHistoryRepository;
    }

    public LocationHistory recordLocation(User user, LocationHistory location) {
        location.setId(null);
        location.setUserId(user.getId());
        if (location.getStatus() == null) {
            location.setStatus("TRACKING");
        }
        return locationHistoryRepository.save(location);
    }

    public List<LocationHistory> getUserLocationHistory(User user) {
        return locationHistoryRepository.findByUserIdOrderByTimestampDesc(user.getId());
    }

    public void clearUserLocationHistory(User user) {
        locationHistoryRepository.deleteByUserId(user.getId());
    }
}

