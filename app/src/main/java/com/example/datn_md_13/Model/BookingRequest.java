package com.example.datn_md_13.Model;

import java.util.ArrayList;
import java.util.List;

public class BookingRequest {
    public String showtimeId;
    public ArrayList<String> seatIds;

    public List<ComboReq> combos;     // null nếu chưa mua combo
    public ArrayList<String> vouchers; // danh sách mã

    public String payment_method; // "cash" | "momo" | "zalopay" | "vnpay"

    public static class ComboReq {
        public String productId;
        public int qty;
        public Integer unit_price; // optional: nếu FE truyền sẵn giá
        public String name;        // optional (để server trả lại hiển thị)
        public String type;        // optional ("combo","drink","popcorn")
    }
}
