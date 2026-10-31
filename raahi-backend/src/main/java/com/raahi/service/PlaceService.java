package com.raahi.service;

import com.raahi.entity.SavedPlace;
import com.raahi.entity.User;
import com.raahi.exception.ResourceNotFoundException;
import com.raahi.repository.sql.SavedPlaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlaceService {

    private final SavedPlaceRepository savedPlaceRepository;

    public PlaceService(SavedPlaceRepository savedPlaceRepository) {
        this.savedPlaceRepository = savedPlaceRepository;
    }

    public List<SavedPlace> getUserPlaces(User user) {
        return savedPlaceRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public SavedPlace savePlace(User user, SavedPlace place) {
        place.setId(null);
        place.setUserId(user.getId());
        return savedPlaceRepository.save(place);
    }

    @Transactional
    public boolean deletePlace(User user, Long id) {
        return savedPlaceRepository.findByIdAndUserId(id, user.getId())
                .map(place -> {
                    savedPlaceRepository.delete(place);
                    return true;
                }).orElse(false);
    }
}

