package com.example.datn_md_13.Model;

public class PaymentInit {
    public static class Req {
        public String ticketId;
        public String method;
        public Req(String ticketId, String method) { this.ticketId = ticketId; this.method = method; }
    }
    public static class Res {
        public String status;       // "ready" | "ok"
        public Next next;

        public static class Next {
            public String deeplink;     // ví điện tử
            public String redirect_url; // web fallback
        }
    }
}
