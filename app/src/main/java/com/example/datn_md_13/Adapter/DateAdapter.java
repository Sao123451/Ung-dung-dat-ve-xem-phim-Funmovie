package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.R;
import com.google.android.material.card.MaterialCardView;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class DateAdapter extends RecyclerView.Adapter<DateAdapter.VH> {

    public interface OnSelect { void onSelect(String yyyyMMdd); }

    private final List<String> days = new ArrayList<>(); // mỗi phần tử dạng "yyyy-MM-dd"
    private int selected = 0;
    private final OnSelect cb;

    // formatter dùng để parse/hiển thị
    private final SimpleDateFormat isoFmt  = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
    private final SimpleDateFormat dowFmt  = new SimpleDateFormat("EEE", Locale.getDefault()); // THU, FRI...
    private final Calendar calendar        = Calendar.getInstance();

    public DateAdapter(OnSelect cb) { this.cb = cb; }

    public void submit(List<String> list) {
        days.clear();
        if (list != null) days.addAll(list);
        selected = 0;
        notifyDataSetChanged();

    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_date_chip, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        String d = days.get(pos); // yyyy-MM-dd

        // Parse ngày để hiển thị số ngày & thứ
        try {
            calendar.setTime(isoFmt.parse(d));
            h.tvDayNum.setText(String.valueOf(calendar.get(Calendar.DAY_OF_MONTH)));
            h.tvDaySub.setText(pos == 0 ? "Hôm nay" : dowFmt.format(calendar.getTime()).toUpperCase(Locale.getDefault()));
        } catch (ParseException e) {
            h.tvDayNum.setText("--");
            h.tvDaySub.setText("");
        }

        MaterialCardView card = (MaterialCardView) h.itemView;
        card.setChecked(pos == selected);

        h.itemView.setOnClickListener(v -> {
            int old = selected;
            selected = h.getAdapterPosition();
            if (old != selected) {
                notifyItemChanged(old);
                notifyItemChanged(selected);
            }
            if (cb != null) cb.onSelect(days.get(selected)); // ✅ chỉ gọi khi user bấm
        });
    }

    @Override
    public int getItemCount() { return days.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvDayNum, tvDaySub;
        VH(View v) {
            super(v);
            tvDayNum = v.findViewById(R.id.tvDayNum);
            tvDaySub = v.findViewById(R.id.tvDaySub);
        }
    }
}
