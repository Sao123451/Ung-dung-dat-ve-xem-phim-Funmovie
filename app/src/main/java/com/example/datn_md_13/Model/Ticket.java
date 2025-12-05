package com.example.datn_md_13.Model;

public class Ticket {

    public String _id;
    public String status;               // pending | paid | cancelled
    public String payment_status;       // 🔥 THÊM — unpaid | paid | failed
    public String payment_method;       // 🔥 THÊM — cash | vnpay | momo...
    public String reservation_code;
    public int total_after;
    public String createdAt;

    public MovieSnapshot movie_snapshot;
    public CinemaSnapshot cinema_snapshot;
    public ShowtimeSnapshot showtime_snapshot;

    public static class MovieSnapshot {
        public String title;
        public String rating;
    }

    public static class CinemaSnapshot {
        public String name;
        public String address;
        public String city;
    }

    public static class ShowtimeSnapshot {
        public String date;
        public String time;
    }
}
