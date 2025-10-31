package com.example.datn_md_13.Model;

public class SeatVM {
    public String _id;     // id ghế 1 (hoặc ghế đơn)
    public String _id2;    // id ghế 2 nếu là ghế đôi
    public String row;
    public int number;     // số của ghế đầu (nếu đôi là số nhỏ hơn)
    public String type;    // normal | vip | couple
    public String status;  // available | sold | broken
    public int priceExtra; // extra tổng (ghế đôi = extra1 + extra2)
    public boolean selected;

    // layout
    public int span = 1;   // couple = 2

    public String label() {
        if (_id2 != null) return row + number + "–" + (number + 1);
        return row + number;
    }
    public int qty() { return _id2 != null ? 2 : 1; }
    public boolean isAvailable() { return "available".equalsIgnoreCase(status); }
    public boolean isSold()      { return "sold".equalsIgnoreCase(status); }
    public boolean isBroken()    { return "broken".equalsIgnoreCase(status); }
}
