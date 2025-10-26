package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class BannerDto {
    @SerializedName("_id") public String id;
    public String title;
    public String link_url;

    public List<ImageItem> images;

    public static class ImageItem {
        // API trả "image_url" → map đúng tên này
        @SerializedName("image_url")
        public String image_url;

        public String movie_id;
    }
}
