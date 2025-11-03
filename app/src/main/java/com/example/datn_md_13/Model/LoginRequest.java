package com.example.datn_md_13.Model;

public class LoginRequest {
    private String usernameOrEmail;
    private String password;

    public LoginRequest() {}
    public LoginRequest(String usernameOrEmail, String password) {
        this.usernameOrEmail = usernameOrEmail;
        this.password = password;
    }
    public String getUsernameOrEmail() { return usernameOrEmail; }
    public void setUsernameOrEmail(String v) { this.usernameOrEmail = v; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
