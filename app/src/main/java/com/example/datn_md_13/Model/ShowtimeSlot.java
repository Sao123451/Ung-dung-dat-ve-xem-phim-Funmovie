package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class ShowtimeSlot {
    @SerializedName("_id")
    public String id;
    public Date start_time;
    public String room_type;            // "2D","3D","IMAX"
    public String room_name;
    public Integer available_seats;
    public Double ticket_price;
}
