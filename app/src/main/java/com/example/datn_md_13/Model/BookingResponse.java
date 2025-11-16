package com.example.datn_md_13.Model;

public class BookingResponse {
    private String message;
    private String ticket_id;
    private String reservation_code;
    private String qr_data;
    private String expires_at;

    public String getMessage() { return message; }
    public String getTicketId() { return ticket_id; }
    public String getReservationCode() { return reservation_code; }
    public String getQrData() { return qr_data; }
    public String getExpiresAt() { return expires_at; }
}
