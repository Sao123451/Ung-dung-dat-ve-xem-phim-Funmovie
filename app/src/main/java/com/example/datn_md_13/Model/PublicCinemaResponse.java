package com.example.datn_md_13.Model;

import java.io.Serializable;
import java.util.List;

public class PublicCinemaResponse implements Serializable {
    public List<Cinema> items;
    public int total;
    public int page;
    public int limit;
}
