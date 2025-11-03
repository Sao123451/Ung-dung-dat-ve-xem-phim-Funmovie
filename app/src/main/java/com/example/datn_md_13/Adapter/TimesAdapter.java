package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Model.ShowtimeSlot;
import com.example.datn_md_13.R;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class TimesAdapter extends RecyclerView.Adapter<TimesAdapter.VH> {

    public interface OnClick { void onClick(ShowtimeSlot slot); }

    private final List<ShowtimeSlot> data = new ArrayList<>();
    private final OnClick cb;
    private final SimpleDateFormat timeFmt = new SimpleDateFormat("HH:mm", Locale.getDefault());

    public TimesAdapter(OnClick cb) { this.cb = cb; }

    public void submit(List<ShowtimeSlot> list) {
        data.clear();
        if (list != null) data.addAll(list);
        notifyDataSetChanged();
    }

    /** Cập nhật theo index (giữ cho tương thích cũ) */
    public void updateAvailableAt(int index, int available) {
        if (index < 0 || index >= data.size()) return;
        ShowtimeSlot s = data.get(index);
        s.available_seats = available;
        notifyItemChanged(index);
    }

    /** ✅ Cập nhật theo id suất chiếu (an toàn khi RV recycle/di chuyển) */
    public void updateAvailableById(String slotId, int available) {
        if (slotId == null) return;
        for (int i = 0; i < data.size(); i++) {
            ShowtimeSlot s = data.get(i);
            if (slotId.equals(s.id)) {
                s.available_seats = available;
                notifyItemChanged(i);
                break;
            }
        }
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_time_chip, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        ShowtimeSlot s = data.get(pos);
        h.tvTime.setText(s.start_time != null ? timeFmt.format(s.start_time) : "--:--");

        int seats = (s.available_seats == null) ? 0 : s.available_seats;
        h.tvSeats.setText(seats + " trống");

        h.itemView.setOnClickListener(v -> {
            if (cb != null) cb.onClick(s);
        });
    }

    @Override public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvTime, tvSeats;
        VH(@NonNull View v) {
            super(v);
            tvTime  = v.findViewById(R.id.tvTime);
            tvSeats = v.findViewById(R.id.tvSeats);
        }
    }
}
