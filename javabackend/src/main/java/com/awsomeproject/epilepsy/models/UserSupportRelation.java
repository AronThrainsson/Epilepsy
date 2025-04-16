package com.awsomeproject.epilepsy.models;

import jakarta.persistence.*;

@Entity
@Table(
        name = "user_support_relation",
        uniqueConstraints = @UniqueConstraint(columnNames = {"epilepsy_user_id", "support_user_id"})
)
public class UserSupportRelation {

    @Id
    private String id; // Removed @GeneratedValue

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

    public String getId() {
        return id;
    }

    public void setId(String id) { this.id = id; }

    public User getEpilepsyUser() {
        return epilepsyUser;
    }

    public void setEpilepsyUser(User epilepsyUser) {
        this.epilepsyUser = epilepsyUser;
    }

    public User getSupportUser() {
        return supportUser;
    }

    public void setSupportUser(User supportUser) {
        this.supportUser = supportUser;
    }
}