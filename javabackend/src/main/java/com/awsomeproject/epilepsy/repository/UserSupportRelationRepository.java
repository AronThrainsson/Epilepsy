package com.awsomeproject.epilepsy.repository;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.models.UserSupportRelation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserSupportRelationRepository extends JpaRepository<UserSupportRelation, Long> {

    List<UserSupportRelation> findBySupportUser(User supportUser);
    List<UserSupportRelation> findByEpilepsyUser(User epilepsyUser);

    boolean existsByEpilepsyUserAndSupportUser(User epilepsyUser, User supportUser);
}