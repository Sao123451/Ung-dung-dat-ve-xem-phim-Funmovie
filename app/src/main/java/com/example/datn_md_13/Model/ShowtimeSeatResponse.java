// ShowtimeSeatResponse.java
package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class ShowtimeSeatResponse {
    public STMini showtime;     // thông tin suất chiếu
    public List<Seat> seats;    // danh sách ghế phẳng

    public static class STMini {
        @SerializedName("_id") public String id;
        @SerializedName("ticket_price") public Double ticketPrice;
        public RoomMini room;
    }
    public static class RoomMini {
        @SerializedName("_id") public String id;
        public String name;
        public String type; // 2D/3D/IMAX
    }
}
