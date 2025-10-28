package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Model.Cinema;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CityCinemaAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_CITY = 0;
    private static final int TYPE_CINEMA = 1;

    public interface OnCinemaClick { void onClick(Cinema c); }

    private final OnCinemaClick onCinemaClick;

    // dữ liệu gốc (giữ nguyên theo city)
    private final Map<String, List<Cinema>> data = new LinkedHashMap<>();
    // trạng thái expand theo city
    private final Map<String, Boolean> expandState = new LinkedHashMap<>();
    // danh sách hàng hiển thị (header + child)
    private final List<Row> rows = new ArrayList<>();

    public CityCinemaAdapter(OnCinemaClick cb) {
        this.onCinemaClick = cb;
    }

    public void submit(Map<String, List<Cinema>> grouped) {
        data.clear();
        data.putAll(grouped);
        // init expand mặc định false cho city mới
        for (String city : data.keySet()) {
            if (!expandState.containsKey(city)) expandState.put(city, false);
        }
        rebuildRows();
    }

    private void rebuildRows() {
        rows.clear();
        for (String city : data.keySet()) {
            boolean expanded = expandState.get(city) != null && expandState.get(city);
            Row header = new Row(TYPE_CITY);
            header.city = city;
            header.count = data.get(city) == null ? 0 : data.get(city).size();
            header.expanded = expanded;
            rows.add(header);

            if (expanded && data.get(city) != null) {
                for (Cinema c : data.get(city)) {
                    Row child = new Row(TYPE_CINEMA);
                    child.cinema = c;
                    rows.add(child);
                }
            }
        }
        notifyDataSetChanged();
    }

    @Override public int getItemViewType(int position) { return rows.get(position).type; }

    @NonNull @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == TYPE_CITY) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_city_group, parent, false);
            return new CityVH(v);
        } else {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_cinema, parent, false);
            return new CinemaVH(v);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder h, int pos) {
        Row r = rows.get(pos);
        if (getItemViewType(pos) == TYPE_CITY) {
            CityVH vh = (CityVH) h;
            vh.tvCity.setText(r.city);
            vh.tvCount.setText(String.valueOf(r.count));
            vh.ivArrow.setRotation(r.expanded ? 180f : 0f);

            vh.itemView.setOnClickListener(v -> {
                boolean now = !(expandState.get(r.city) != null && expandState.get(r.city));
                expandState.put(r.city, now);
                rebuildRows();
            });
        } else {
            CinemaVH vh = (CinemaVH) h;
            vh.tvName.setText(r.cinema.getName());
            String addr = r.cinema.getAddress();
            vh.tvAddress.setText((addr == null || addr.isEmpty()) ? "—" : addr);
            vh.itemView.setOnClickListener(v -> {
                if (onCinemaClick != null) onCinemaClick.onClick(r.cinema);
            });
        }
    }

    @Override public int getItemCount() { return rows.size(); }

    // ==== ViewHolders & Row model ====
    static class CityVH extends RecyclerView.ViewHolder {
        TextView tvCity, tvCount;
        ImageView ivArrow;
        CityVH(@NonNull View itemView) {
            super(itemView);
            tvCity = itemView.findViewById(R.id.tvCity);
            tvCount = itemView.findViewById(R.id.tvCount);
            ivArrow = itemView.findViewById(R.id.ivArrow);
        }
    }

    static class CinemaVH extends RecyclerView.ViewHolder {
        TextView tvName, tvAddress;
        CinemaVH(@NonNull View itemView) {
            super(itemView);
            tvName = itemView.findViewById(R.id.tvName);
            tvAddress = itemView.findViewById(R.id.tvAddress);
        }
    }

    static class Row {
        int type;           // 0: city header, 1: cinema item
        String city;
        boolean expanded;
        int count;
        Cinema cinema;
        Row(int t) { this.type = t; }
    }
}
