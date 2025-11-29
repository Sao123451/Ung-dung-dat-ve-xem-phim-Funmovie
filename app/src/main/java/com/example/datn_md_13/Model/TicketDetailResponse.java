package com.example.datn_md_13.Model;

import java.util.List;
public class TicketDetailResponse {

    public String _id;
    public String reservation_code;
    public String status;
    public String payment_method;
    public String payment_status;
    public int total_after;

    public Showtime showtime;
    public User user;
    public List<SeatItem> seats;
    public List<ComboItem> combos;

    public static class Showtime {
        public String _id;
        public String start_time;
        public Movie movie;
        public Cinema cinema;
        public Room room;
    }

    public static class Movie {
        public String title;
        public String poster;
        public int duration;
    }

    public static class Cinema {
        public String name;
    }

    public static class Room {
        public String name;
    }

    public static class SeatItem {
        public String row;
        public int number;
        public String seat_type;
        public int price_final;
    }

    public static class ComboItem {
        public String name;
        public int qty;
        public int line_total;
    }

    public static class User {
        public String full_name;
        public String email;
    }
}
