package com.raahi.service;

import com.raahi.entity.EmergencyContact;
import com.raahi.entity.User;
import com.raahi.exception.ResourceNotFoundException;
import com.raahi.repository.sql.EmergencyContactRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ContactService {

    private final EmergencyContactRepository contactRepository;

    public ContactService(EmergencyContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    public List<EmergencyContact> getUserContacts(User user) {
        return contactRepository.findByUserIdOrderByIsPrimaryDescCreatedAtAsc(user.getId());
    }

    @Transactional
    public EmergencyContact addContact(User user, EmergencyContact contact) {
        contact.setId(null);
        contact.setUserId(user.getId());
        if (contact.getName() == null || contact.getName().isBlank()) {
            contact.setName("Emergency Contact");
        }
        return contactRepository.save(contact);
    }

    @Transactional
    public EmergencyContact updateContact(User user, Long id, EmergencyContact updated) {
        EmergencyContact existing = contactRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id " + id));

        if (updated.getName() != null && !updated.getName().isBlank()) existing.setName(updated.getName().trim());
        if (updated.getPhone() != null && !updated.getPhone().isBlank()) existing.setPhone(updated.getPhone().trim());
        if (updated.getRelation() != null) existing.setRelation(updated.getRelation().trim());
        if (updated.getIsPrimary() != null) existing.setIsPrimary(updated.getIsPrimary());

        return contactRepository.save(existing);
    }

    @Transactional
    public boolean deleteContact(User user, Long id) {
        return contactRepository.findByIdAndUserId(id, user.getId())
                .map(contact -> {
                    contactRepository.delete(contact);
                    return true;
                }).orElse(false);
    }
}

