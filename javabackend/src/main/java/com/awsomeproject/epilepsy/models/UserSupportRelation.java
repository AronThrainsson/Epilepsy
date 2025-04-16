package com.awsomeproject.epilepsy.models;

import jakarta.persistence.*;

@Entity
@Table(name = "user_support_relation")
public class UserSupportRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "epilepsy_user_id")
    private User epilepsyUser;

    @ManyToOne
    @JoinColumn(name = "support_user_id")
    private User supportUser;

    public UserSupportRelation() {}

    public UserSupportRelation(User epilepsyUser, User supportUser) {
        this.epilepsyUser = epilepsyUser;
        this.supportUser = supportUser;
    }

    public Long getId() {
        return id;
    }

    public User getEpilepsyUser() {
        return epilepsyUser;
    }

    public User getSupportUser() {
        return supportUser;
    }
}