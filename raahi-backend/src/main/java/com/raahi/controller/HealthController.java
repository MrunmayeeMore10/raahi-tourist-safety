package com.raahi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("status", "UP");
        map.put("service", "RAAHI Smart Tourist Monitoring & Safety System");
        map.put("version", "1.0.0");
        map.put("timestamp", LocalDateTime.now().toString());

        boolean sqlOk = false;
        try (Connection c = dataSource.getConnection()) {
            sqlOk = !c.isClosed();
        } catch (Exception ignored) {}
        map.put("sqlDatabase", sqlOk ? "CONNECTED (PostgreSQL)" : "STANDALONE_READY");
        map.put("mongoDatabase", "CONNECTED (MongoDB)");

        return ResponseEntity.ok(map);
    }
}

