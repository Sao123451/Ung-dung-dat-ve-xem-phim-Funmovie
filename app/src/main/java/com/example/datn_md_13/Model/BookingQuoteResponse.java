package com.example.datn_md_13.Model;

import java.util.List;
import java.util.Map;

public class BookingQuoteResponse {
    public Map<String, Object> showtime; // dùng nếu cần
    public List<SeatLine> seatLines;
    public List<ComboLine> comboLines;
    public Breakdown breakdown;
    public List<String> accepted_vouchers;

    public static class SeatLine {
        public String seatId;
        public String row;
        public int number;
        public String seat_type;
        public int price_base;
        public int price_extra;
        public int price_final;
    }

    public static class ComboLine {
        public String productId;
        public String name;
        public String type;
        public int qty;
        public int unit_price;
        public int total_price;
    }

    public static class Breakdown {
        public int seat_subtotal;
        public int combo_subtotal;
        public int total_before;
        public int discount_seat;
        public int discount_combo;
        public int discount_order;
        public int total_after;
    }
}
