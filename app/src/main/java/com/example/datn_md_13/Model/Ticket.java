package com.example.datn_md_13.Model;

import java.util.List;

public class Ticket {
    public String _id;
    public String status;
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
