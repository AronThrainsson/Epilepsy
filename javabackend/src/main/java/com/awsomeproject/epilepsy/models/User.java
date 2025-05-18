package com.awsomeproject.epilepsy.models;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String email;
    private String password;

    @Column(name = "push_token")
    private String pushToken;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "surname")
    private String surname;

    @Column(name = "phone")
    private String phone;

    @Enumerated(EnumType.STRING)
    private Role role;

    
    @Column(name = "info_during_seazure")
    private String infoDuringSeazure;

    @Column(name = "is_available")
    private Boolean isAvailable = true;

    public User() {}

    public User(String email, String password, String firstName, String surname, String phone, Role role) {
        this.email = email;
        this.password = password;
        this.firstName = firstName;
        this.surname = surname;
        this.phone = phone;
        this.role = role;
        this.isAvailable = true;
    }

    public String getPushToken() {
        return pushToken;
    }
    public void setPushToken(String pushToken) {
        this.pushToken = pushToken;
    }

    public Long getId() { return id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getSurname() { return surname; }
    public void setSurname(String surname) { this.surname = surname; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    
    public String getInfoDuringSeazure() { return infoDuringSeazure; }
    public void setInfoDuringSeazure(String infoDuringSeazure) { this.infoDuringSeazure = infoDuringSeazure; }

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
}