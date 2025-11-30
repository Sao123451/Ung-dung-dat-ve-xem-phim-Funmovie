package com.example.datn_md_13.Model;

import com.google.gson.annotations.SerializedName;

public class ProductDto {
    // Nhận cả "_id" (Mongo) lẫn "id" (nếu BE trả kiểu khác)
    @SerializedName(value = "_id", alternate = {"id"})
    public String id;

    public String name;      // tên sản phẩm
    public String type;      // combo | drink | popcorn
    public Integer price;    // đơn giá (VND)
    public String image;
}
