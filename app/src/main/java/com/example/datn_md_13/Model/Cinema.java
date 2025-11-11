package com.example.datn_md_13.Model;

import java.io.Serializable;

public class Cinema implements Serializable {
    private String _id;
    private String name;
    private String address;
    private String city;
    private String hotline;
    private Double latitude;
    private Double longitude;

    public String getId() { return _id; }
    public String getName() { return name == null ? "" : name; }
    public String getAddress() { return address == null ? "" : address; }
    public String getCity() { return city == null ? "" : city; }
    public String getHotline() { return hotline == null ? "" : hotline; }



    public Double getLatitude()  { return latitude; }
    public Double getLongitude() { return longitude; }

}

