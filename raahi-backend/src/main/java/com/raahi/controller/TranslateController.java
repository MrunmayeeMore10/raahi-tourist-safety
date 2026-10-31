package com.raahi.controller;

import com.raahi.dto.TranslateRequest;
import com.raahi.dto.TranslateResponse;
import com.raahi.service.TranslationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TranslateController {

    private final TranslationService translationService;

    public TranslateController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping({"/translate", "/translator/translate"})
    public ResponseEntity<TranslateResponse> translate(@Valid @RequestBody TranslateRequest request) {
        TranslateResponse response = translationService.translate(request);
        if (!response.isSuccess() && response.getError() != null) {
            return ResponseEntity.status(502).body(response);
        }
        return ResponseEntity.ok(response);
    }
}

