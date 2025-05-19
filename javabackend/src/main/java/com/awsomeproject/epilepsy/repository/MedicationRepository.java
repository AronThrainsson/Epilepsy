package com.awsomeproject.epilepsy.repository;

import com.awsomeproject.epilepsy.models.Medication;
import com.awsomeproject.epilepsy.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findByUser(User user);
    List<Medication> findByUserId(Long userId);
    List<Medication> findByEnabled(boolean enabled);
    void deleteByUserAndId(User user, Long id);
} 