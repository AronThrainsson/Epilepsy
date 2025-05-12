package com.awsomeproject.epilepsy.repository;

import com.awsomeproject.epilepsy.models.Seizure;
import com.awsomeproject.epilepsy.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeizureRepository extends JpaRepository<Seizure, Long> {
    List<Seizure> findByEpilepsyUser(User epilepsyUser);
}