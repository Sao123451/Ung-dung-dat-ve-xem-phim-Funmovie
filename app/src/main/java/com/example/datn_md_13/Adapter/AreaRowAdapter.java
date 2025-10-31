package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Activity.AreaPickerActivity;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.List;

public class AreaRowAdapter extends RecyclerView.Adapter<AreaRowAdapter.VH> {

    public interface OnPick { void onPick(String city); }

    private final List<AreaPickerActivity.AreaRow> data = new ArrayList<>();
    private final OnPick cb;

    public AreaRowAdapter(OnPick cb){ this.cb = cb; }

    public void submit(List<AreaPickerActivity.AreaRow> rows){
        data.clear();
        if (rows!=null) data.addAll(rows);
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup p, int v) {
        return new VH(LayoutInflater.from(p.getContext())
                .inflate(R.layout.item_area_row, p, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        AreaPickerActivity.AreaRow r = data.get(pos); // KHÔNG dùng 'var'
        h.tvName.setText(r.name);
        h.tvCount.setText(String.valueOf(r.count));
        h.itemView.setOnClickListener(v -> cb.onPick("Tất cả".equals(r.name) ? "" : r.name));
    }

    @Override
    public int getItemCount(){ return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvName, tvCount;
        VH(@NonNull View v){
            super(v);
            tvName  = v.findViewById(R.id.tvName);
            tvCount = v.findViewById(R.id.tvCount);
        }
    }
}
