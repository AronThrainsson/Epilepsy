package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.awsomeproject.epilepsy.services.infoObjects.*;
import java.util.logging.Logger;

@Service
public class ProfileService {
    
    private static final Logger logger = Logger.getLogger(ProfileService.class.getName());

    @Autowired
    private UserRepository userRepository;

    public UserInfo getProfile(Long userId) {
        User user = userRepository.findById(userId).get();
        
        UserInfo info = new UserInfo();
        info.id = user.getId();
        info.email = user.getEmail();
        info.firstName = user.getFirstName();
        info.surname = user.getSurname();
        info.phone = user.getPhone();
        info.infoDuringSeazure = user.getInfoDuringSeazure();

        return info;        
    }

    public Boolean updateProfile(UserInfo userInfo) {
       Optional<User> existingUserOptional = userRepository.findById(userInfo.id);

       // error if user does not exist
       if (existingUserOptional.isEmpty()) 
            return false;

        var existingUser = existingUserOptional.get();

        existingUser.setFirstName(userInfo.firstName);
        existingUser.setSurname(userInfo.surname);
        existingUser.setPhone(userInfo.phone);
        existingUser.setInfoDuringSeazure(userInfo.infoDuringSeazure);
        
        // save changes to database
        userRepository.save(existingUser);

       // success
       return true;
    }
    
    /**
     * Updates a user's push token for receiving notifications
     * 
     * @param userId The user ID to update
     * @param pushToken The new push token
     * @return true if successful, false otherwise
     */
    public boolean updatePushToken(Long userId, String pushToken) {
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            logger.warning("Cannot update push token: User not found with ID " + userId);
            return false;
        }
        
        User user = userOptional.get();
        user.setPushToken(pushToken);
        
        try {
            userRepository.save(user);
            logger.info("Updated push token for user: " + user.getEmail());
            return true;
        } catch (Exception e) {
            logger.severe("Error updating push token: " + e.getMessage());
            return false;
        }
    }
}
