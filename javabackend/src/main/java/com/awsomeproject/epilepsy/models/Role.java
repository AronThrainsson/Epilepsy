package com.awsomeproject.epilepsy.models;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Role {
    EPILEPSY,
    SUPPORT;

    @JsonCreator
    public static Role fromString(String value) {
        return Role.valueOf(value.toUpperCase());
    }
}