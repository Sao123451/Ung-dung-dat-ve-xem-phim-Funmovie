// ShowtimeDetail.java
package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;

public class ShowtimeDetail {
    @SerializedName("_id") public String id;
    public Movie movie;
    public Cinema cinema;
    public RoomMini room;
    @SerializedName("ticket_price") public Double ticketPrice;
    @SerializedName("start_time") public String startTime;
    @SerializedName("end_time") public String endTime;

    public static class RoomMini {
        @SerializedName("_id") public String id;
        public String name;
        public String type; // 2D/3D/IMAX
    }
}
