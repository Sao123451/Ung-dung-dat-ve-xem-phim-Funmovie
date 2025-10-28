package com.example.datn_md_13.Model;

import java.io.Serializable;

public class Cinema implements Serializable {
    private String _id;
    private String name;
    private String address;
    private String city;
    private String hotline;

    public String getId() { return _id; }
    public String getName() { return name == null ? "" : name; }
    public String getAddress() { return address == null ? "" : address; }
    public String getCity() { return city == null ? "" : city; }
    public String getHotline() { return hotline == null ? "" : hotline; }
}
