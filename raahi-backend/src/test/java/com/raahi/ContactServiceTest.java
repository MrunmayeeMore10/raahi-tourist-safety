package com.raahi;

import com.raahi.entity.EmergencyContact;
import com.raahi.entity.User;
import com.raahi.repository.sql.EmergencyContactRepository;
import com.raahi.service.ContactService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ContactServiceTest {

    @Mock
    private EmergencyContactRepository contactRepository;

    private ContactService contactService;

    @BeforeEach
    void setUp() {
        contactService = new ContactService(contactRepository);
    }

    @Test
    void testAddAndRetrieveContact() {
        User user = new User("Alice", "alice@example.com", "hash", "1234567890");
        user.setId(10L);

        EmergencyContact contact = new EmergencyContact(10L, "Doctor", "9999999999", "Physician", true);

        when(contactRepository.save(any(EmergencyContact.class))).thenReturn(contact);
        when(contactRepository.findByUserIdOrderByIsPrimaryDescCreatedAtAsc(10L))
                .thenReturn(List.of(contact));

        EmergencyContact saved = contactService.addContact(user, contact);
        assertNotNull(saved);
        assertEquals("Doctor", saved.getName());

        List<EmergencyContact> list = contactService.getUserContacts(user);
        assertEquals(1, list.size());
        assertEquals("9999999999", list.get(0).getPhone());
    }

    @Test
    void testUserDataAccessRestrictions() {
        User user1 = new User("User One", "user1@example.com", "hash", "1111111111");
        user1.setId(1L);

        // User 1 tries to delete contact owned by User 2 (id=99L)
        when(contactRepository.findByIdAndUserId(50L, 1L)).thenReturn(Optional.empty());

        boolean deleted = contactService.deleteContact(user1, 50L);
        assertFalse(deleted);
        verify(contactRepository, never()).delete(any(EmergencyContact.class));
    }
}

