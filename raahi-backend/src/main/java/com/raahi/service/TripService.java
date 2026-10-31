package com.raahi.service;

import com.raahi.entity.Trip;
import com.raahi.entity.User;
import com.raahi.exception.ResourceNotFoundException;
import com.raahi.repository.sql.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TripService {

    private final TripRepository tripRepository;

    public TripService(TripRepository tripRepository) {
        this.tripRepository = tripRepository;
    }

    public List<Trip> getUserTrips(User user) {
        return tripRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public Trip saveTrip(User user, Trip trip) {
        trip.setId(null);
        trip.setUserId(user.getId());
        if (trip.getCheckedIn() == null) trip.setCheckedIn(false);
        return tripRepository.save(trip);
    }

    @Transactional
    public Trip checkIn(User user, Long tripId) {
        Trip trip = tripRepository.findByIdAndUserId(tripId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id " + tripId));

        trip.setCheckedIn(true);
        trip.setCheckInAt(LocalDateTime.now().toString());
        return tripRepository.save(trip);
    }

    @Transactional
    public boolean deleteTrip(User user, Long tripId) {
        return tripRepository.findByIdAndUserId(tripId, user.getId())
                .map(t -> {
                    tripRepository.delete(t);
                    return true;
                }).orElse(false);
    }
}

