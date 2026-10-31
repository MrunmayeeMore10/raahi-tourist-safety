package com.raahi.repository.sql;

import com.raahi.entity.SavedPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedPlaceRepository extends JpaRepository<SavedPlace, Long> {
    List<SavedPlace> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<SavedPlace> findByIdAndUserId(Long id, Long userId);
}

