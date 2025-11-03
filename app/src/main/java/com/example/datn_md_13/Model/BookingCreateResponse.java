package com.example.datn_md_13.Model;

public class BookingCreateResponse {
    public String message;
    public int hold_minutes;
    public Ticket ticket;

    public static class Ticket {
        public String id;           // map từ _id nếu backend trả _id
        public String _id;          // fallback
        public String status;       // pending/paid/expired...
        public String payment_status;
        public String payment_method;
        public String payment_id;
        public int seat_subtotal, combo_subtotal, discount_seat, discount_combo, discount_order, total_before, total_after;

        // tiện dụng
        public String getId() { return id != null ? id : _id; }
    }
}
