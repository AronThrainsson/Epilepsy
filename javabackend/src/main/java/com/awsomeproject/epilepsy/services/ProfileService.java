package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.awsomeproject.epilepsy.services.infoObjects.*;

@Service
public class ProfileService {

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
        
        // save changes to database
        userRepository.save(existingUser);

       // success
       return true;
    }
}
