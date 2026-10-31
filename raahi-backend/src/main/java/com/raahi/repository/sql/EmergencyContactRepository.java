package com.raahi.repository.sql;

import com.raahi.entity.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {
    List<EmergencyContact> findByUserIdOrderByIsPrimaryDescCreatedAtAsc(Long userId);
    Optional<EmergencyContact> findByIdAndUserId(Long id, Long userId);
}

