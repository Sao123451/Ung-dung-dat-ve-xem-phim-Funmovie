package com.example.datn_md_13.Model;

import java.util.List;

public class NewsListResponse {
    public List<News> items;
    public int total;
    public int page;
    public int limit; // backend trả 'limit'
}
