package com.awsomeproject.epilepsy.repository;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.models.UserSupportRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface UserSupportRelationRepository extends JpaRepository<UserSupportRelation, String> {

    List<UserSupportRelation> findBySupportUser(User supportUser);
    List<UserSupportRelation> findByEpilepsyUser(User epilepsyUser);

    boolean existsByEpilepsyUserAndSupportUser(User epilepsyUser, User supportUser);
    
    List<UserSupportRelation> findBySupportUser(User supportUser);

    @Query("SELECT r FROM UserSupportRelation r WHERE r.supportUser.email = :email")
    List<UserSupportRelation> findBySupportUserEmail(@Param("email") String email);

    @Transactional
    void deleteByEpilepsyUserAndSupportUser(User epilepsyUser, User supportUser);
}