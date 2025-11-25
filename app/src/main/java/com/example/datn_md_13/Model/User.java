package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class User {

    // Token dùng cho login
    @SerializedName("token")
    private String token;

    @SerializedName("_id")
    private String id;

    @SerializedName("username")
    private String username;

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

    @SerializedName("gender")
    private String gender;

    @SerializedName("birth_date")
    private String birthDate;

    @SerializedName("address")
    private String address;

    @SerializedName("usernameOrEmail")
    private String usernameOrEmail;

    @SerializedName("currentPassword")
    private String currentPassword;

    @SerializedName("newPassword")
    private String newPassword;

    // ⭐ THÊM TRƯỜNG MỚI — THẺ THÀNH VIÊN
    @SerializedName("membership_card")
    private String membership_card;


    public User() { }

    public User(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public User(String usernameOrEmail, String password, boolean isLoginConstructor) {
        this.usernameOrEmail = usernameOrEmail;
        this.password = password;
    }

    // ================== GETTERS / SETTERS ==================

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

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

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getUsernameOrEmail() { return usernameOrEmail; }
    public void setUsernameOrEmail(String usernameOrEmail) { this.usernameOrEmail = usernameOrEmail; }

    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }

    // ⭐ GETTER & SETTER CHO membership_card
    public String getMembership_card() {
        return membership_card;
    }

    public void setMembership_card(String membership_card) {
        this.membership_card = membership_card;
    }


    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", username='" + username + '\'' +
                ", full_name='" + full_name + '\'' +
                ", phone='" + phone + '\'' +
                ", email='" + email + '\'' +
                ", role='" + role + '\'' +
                ", avatar='" + avatar + '\'' +
                ", gender='" + gender + '\'' +
                ", birthDate='" + birthDate + '\'' +
                ", address='" + address + '\'' +
                ", membership_card='" + membership_card + '\'' +
                ", status='" + status + '\'' +
                ", created_at=" + created_at +
                '}';
    }
}
