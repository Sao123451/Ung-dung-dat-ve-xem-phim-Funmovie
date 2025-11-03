package com.example.datn_md_13.Model;

public class VoucherDto {
    public String code;
    public String scope;     // seat | combo | order
    public String type;      // percent | amount
    public Integer value;
    public Integer min_total; // có thể null
    public String end_date;   // ISO string (nếu có)
}
