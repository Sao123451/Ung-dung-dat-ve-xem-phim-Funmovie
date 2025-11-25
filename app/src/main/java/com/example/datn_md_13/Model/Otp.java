package com.example.datn_md_13.Model;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class Otp {

    private String email;
    private String code;
    private String expires_at;

    public long getExpiresAtMillis() {
        try {
            SimpleDateFormat sdf =
                    new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            Date d = sdf.parse(expires_at);
            return d.getTime();
        } catch (Exception e) {
            return 0;
        }
    }
}
