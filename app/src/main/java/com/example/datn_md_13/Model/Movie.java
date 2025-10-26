package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.Date;
import java.util.List;

public class Movie {
    @SerializedName("_id")
    public String id;

    public String title;
    public String description;
    public Integer duration;       // minutes
    public String director;
    public List<String> cast;
    public List<String> genre;

    @SerializedName("release_date")
    public Date releaseDate;       // ngày khởi chiếu

    public String language;
    public String poster;          // URL ảnh
    public Double rating;

    // coming | now_showing | archived
    public String status;

    @SerializedName("created_at")
    public Date createdAt;
}
