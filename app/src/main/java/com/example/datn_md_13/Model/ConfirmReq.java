package com.example.datn_md_13.Model;

/** Payload gửi lên /bookings/{id}/confirm */
public class ConfirmReq {
    /** "cash" | "momo" | "zalopay" | ... */
    public String payment_method;

    /** Mã giao dịch từ cổng thanh toán (nếu có), ví dụ MoMo/ZaloPay txnId */
    public String payment_id;

    public ConfirmReq() {}

    public ConfirmReq(String payment_method, String payment_id) {
        this.payment_method = payment_method;
        this.payment_id = payment_id;
    }
}
