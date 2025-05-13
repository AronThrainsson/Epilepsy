package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
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
}
