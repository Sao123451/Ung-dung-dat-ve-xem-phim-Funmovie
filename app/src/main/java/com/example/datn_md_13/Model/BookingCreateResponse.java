package com.example.datn_md_13.Model;

public class BookingCreateResponse {

    public String message;

    // Backend trả ticket_id riêng → thêm nó vào đây
    public String ticket_id;
    public String reservation_code;
    public String qr_data;
    public String expires_at;

    public Ticket ticket;

    public static class Ticket {
        public String id;
        public String _id;
        public String status;
        public String payment_status;
        public String payment_method;
        public String payment_id;
        public int seat_subtotal, combo_subtotal, discount_seat, discount_combo, discount_order, total_before, total_after;

        public String getId() { return id != null ? id : _id; }
    }
}
