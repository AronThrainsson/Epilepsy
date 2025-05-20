//handles data access for seizure in the app
//repository package to handle data acess logic
package com.awsomeproject.epilepsy.repository;

//import models and Spring JPA for database operations
import com.awsomeproject.epilepsy.models.Seizure;
import com.awsomeproject.epilepsy.models.User;
import org.springframework.data.jpa.repository.JpaRepository; //allows buitl-in database methods e.g. .save(),.findAll(),.deleteById() without SQL

import java.util.List; //needed for returning multiple seizure records

//defines Spring data JPA repository for seizure entity / interface for accessing seizure data
//seizure = type of object being managed 
//long = the type of its ID (primary key)
public interface SeizureRepository extends JpaRepository<Seizure, Long> {
    List<Seizure> findByEpilepsyUser(User epilepsyUser);
}