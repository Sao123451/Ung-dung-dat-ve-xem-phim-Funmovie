package com.example.datn_md_13.Model;

public class VnPayInitResponse {
    public String payment_url;
    public Payment payment;

    public static class Payment {
        public String _id;
        public String ticket;
        public double amount;
        public String status;
    }
}
