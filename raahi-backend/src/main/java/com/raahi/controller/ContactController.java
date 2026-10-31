package com.raahi.controller;

import com.raahi.dto.ApiResponse;
import com.raahi.entity.EmergencyContact;
import com.raahi.entity.User;
import com.raahi.service.ContactService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/emergency-contacts", "/api/contacts"})
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmergencyContact>>> getContacts(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(contactService.getUserContacts(user)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EmergencyContact>> addContact(@AuthenticationPrincipal User user,
                                                                    @RequestBody EmergencyContact contact) {
        EmergencyContact saved = contactService.addContact(user, contact);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Contact saved successfully", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmergencyContact>> updateContact(@AuthenticationPrincipal User user,
                                                                       @PathVariable Long id,
                                                                       @RequestBody EmergencyContact contact) {
        EmergencyContact updated = contactService.updateContact(user, id, contact);
        return ResponseEntity.ok(ApiResponse.ok("Contact updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContact(@AuthenticationPrincipal User user,
                                                           @PathVariable Long id) {
        boolean deleted = contactService.deleteContact(user, id);
        if (deleted) {
            return ResponseEntity.ok(ApiResponse.ok("Contact deleted", null));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Contact not found"));
    }
}

