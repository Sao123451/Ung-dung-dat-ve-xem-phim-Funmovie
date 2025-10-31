package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.List;

// SeatRowGroup.java
public class SeatRowGroup {
    public String row;
    public java.util.List<Seat> seats;  // <-- phải là Seat
}

