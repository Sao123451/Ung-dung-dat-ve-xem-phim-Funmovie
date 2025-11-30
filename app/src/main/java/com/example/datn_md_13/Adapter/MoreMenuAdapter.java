package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.R;
import com.example.datn_md_13.Model.MoreMenuItem;

import java.util.List;

public class MoreMenuAdapter extends RecyclerView.Adapter<MoreMenuAdapter.MoreVH> {

    List<MoreMenuItem> list;
    OnMoreMenuClick listener;

    public interface OnMoreMenuClick {
        void onClick(int position);
    }

    public MoreMenuAdapter(List<MoreMenuItem> list, OnMoreMenuClick listener) {
        this.list = list;
        this.listener = listener;
    }

    @NonNull
    @Override
    public MoreVH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_more_menu, parent, false);
        return new MoreVH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull MoreVH holder, int position) {
        MoreMenuItem item = list.get(position);

        holder.icon.setImageResource(item.icon);
        holder.label.setText(item.label);
        holder.icon.setColorFilter(
                ContextCompat.getColor(holder.itemView.getContext(), item.colorRes)
        );

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onClick(position);
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class MoreVH extends RecyclerView.ViewHolder {
        ImageView icon;
        TextView label;

        public MoreVH(@NonNull View itemView) {
            super(itemView);
            icon = itemView.findViewById(R.id.imgIcon);
            label = itemView.findViewById(R.id.tvLabel);
        }
    }
}
