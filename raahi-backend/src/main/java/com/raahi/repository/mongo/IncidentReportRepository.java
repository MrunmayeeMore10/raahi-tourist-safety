package com.raahi.repository.mongo;

import com.raahi.document.IncidentReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentReportRepository extends MongoRepository<IncidentReport, String> {
    List<IncidentReport> findByUserIdOrderByTimestampDesc(Long userId);
    List<IncidentReport> findAllByOrderByTimestampDesc();
}

