package com.raahi.repository.mongo;

import com.raahi.document.EmergencyEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyEventRepository extends MongoRepository<EmergencyEvent, String> {
    List<EmergencyEvent> findByUserIdOrderByTimestampDesc(Long userId);
    Optional<EmergencyEvent> findByEventCode(String eventCode);
}

