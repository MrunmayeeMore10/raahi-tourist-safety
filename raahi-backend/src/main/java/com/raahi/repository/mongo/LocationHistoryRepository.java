package com.raahi.repository.mongo;

import com.raahi.document.LocationHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocationHistoryRepository extends MongoRepository<LocationHistory, String> {
    List<LocationHistory> findByUserIdOrderByTimestampDesc(Long userId);
    void deleteByUserId(Long userId);
}

