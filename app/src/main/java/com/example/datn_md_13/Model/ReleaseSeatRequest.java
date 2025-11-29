package com.example.datn_md_13.Model;

import java.util.List;

public class ReleaseSeatRequest {
    public List<String> seatIds;

    public ReleaseSeatRequest(List<String> seatIds) {
        this.seatIds = seatIds;
    }
}
