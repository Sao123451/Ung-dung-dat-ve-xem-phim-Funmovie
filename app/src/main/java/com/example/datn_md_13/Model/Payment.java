package com.example.datn_md_13.Model;

public class Payment {
    public String _id;
    public String ticket;
    public String user;
    public String method;             // cash | momo | zalopay | vnpay | card | unknown
    public double amount;
    public String status;             // pending | succeeded | failed | refunded
    public String provider_txn_id;    // mã giao dịch của VNPAY
    public String provider_message;   // thông báo từ provider
    public Object meta;               // object linh hoạt
    public String createdAt;
    public String updatedAt;
}
