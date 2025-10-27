package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class User {

    // basic
    @SerializedName("username")
    private String username;

    // not included in toString or logs for security
    @SerializedName("password")
    private String password;

    @SerializedName("full_name")
    private String full_name;

    @SerializedName("phone")
    private String phone;

    @SerializedName("email")
    private String email;

    @SerializedName("role")
    private String role;

    @SerializedName("avatar")
    private String avatar;

    @SerializedName("status")
    private String status;

    @SerializedName("created_at")
    private Date created_at;

    // field used for login payload (usernameOrEmail expected by backend)
    @SerializedName("usernameOrEmail")
    private String usernameOrEmail;

    public User() { }

    // convenient constructors
    public User(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public User(String usernameOrEmail, String password, boolean isLoginConstructor) {
        // isLoginConstructor just to differentiate signature if needed
        this.usernameOrEmail = usernameOrEmail;
        this.password = password;
    }

    // full constructor if you really need it
    public User(String username, String password, String full_name, String phone, String email,
                String role, String avatar, String status, Date created_at, String usernameOrEmail) {
        this.username = username;
        this.password = password;
        this.full_name = full_name;
        this.phone = phone;
        this.email = email;
        this.role = role;
        this.avatar = avatar;
        this.status = status;
        this.created_at = created_at;
        this.usernameOrEmail = usernameOrEmail;
    }

    // getters / setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFull_name() { return full_name; }
    public void setFull_name(String full_name) { this.full_name = full_name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Date getCreated_at() { return created_at; }
    public void setCreated_at(Date created_at) { this.created_at = created_at; }

    public String getUsernameOrEmail() { return usernameOrEmail; }
    public void setUsernameOrEmail(String usernameOrEmail) { this.usernameOrEmail = usernameOrEmail; }

    @Override
    public String toString() {
        return "User{" +
                "username='" + username + '\'' +
                ", full_name='" + full_name + '\'' +
                ", phone='" + phone + '\'' +
                ", email='" + email + '\'' +
                ", role='" + role + '\'' +
                ", avatar='" + avatar + '\'' +
                ", status='" + status + '\'' +
                ", created_at=" + created_at +
                '}';
    }
}
