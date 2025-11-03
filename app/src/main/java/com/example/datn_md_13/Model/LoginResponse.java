package com.example.datn_md_13.Model;

public class LoginResponse {
    private String message;
    private String token; // có thể null nếu backend chưa cấp
    private User user;

    public String getMessage() { return message; }
    public String getToken() { return token; }
    public User getUser() { return user; }
}
