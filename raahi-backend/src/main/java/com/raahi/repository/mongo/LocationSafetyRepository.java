package com.raahi.repository.mongo;

import com.raahi.document.LocationSafety;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LocationSafetyRepository extends MongoRepository<LocationSafety, String> {
    Optional<LocationSafety> findByCityKeyIgnoreCase(String cityKey);
    Optional<LocationSafety> findByCityIgnoreCase(String city);
}

