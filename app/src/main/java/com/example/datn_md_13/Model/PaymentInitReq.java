package com.example.datn_md_13.Model;

public class PaymentInitReq {
    public String ticketId;
    public String method;

    public PaymentInitReq(String ticketId, String method) {
        this.ticketId = ticketId;
        this.method = method;
    }
}
