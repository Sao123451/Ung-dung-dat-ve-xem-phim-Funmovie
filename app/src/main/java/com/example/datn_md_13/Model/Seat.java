// Seat.java
package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;

public class Seat {
    @SerializedName("_id")
    public String _id;

    public String row;
    public int number;

    // normal | vip | couple
    @SerializedName("seat_type")
    public String seat_type;

    @SerializedName("extra_price")
    public int extra_price;

    // [CHANGE] server có thể trả "available" | "holding" | "sold" | "broken"
    @SerializedName(value = "seat_status", alternate = { "status" })
    public String seat_status;

    // Giữ lại cho tương thích với API cũ (không bắt buộc)
    @SerializedName(value = "is_booked", alternate = { "isBooked" })
    public boolean is_booked;

    // API cũ: active=false => broken
    public boolean active = true;

    // Helper: nếu server chưa gửi seat_status, suy ra từ cờ cũ
    public String resolvedStatus() {
        if (seat_status != null && !seat_status.isEmpty()) {
            return seat_status; // có thể là holding
        }
        if (!active) return "broken";
        return is_booked ? "sold" : "available";
    }
}
