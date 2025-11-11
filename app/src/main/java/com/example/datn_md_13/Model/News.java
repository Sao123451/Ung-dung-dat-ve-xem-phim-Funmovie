package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class News {
    @SerializedName("_id") public String id;
    public String slug;
    public String title;
    public String content;
    public String excerpt;

    @SerializedName("cover_image")
    public String coverImage;          // backend: cover_image

    @SerializedName("published_at")
    public Date publishedAt;           // backend: published_at (ISO string)
}
