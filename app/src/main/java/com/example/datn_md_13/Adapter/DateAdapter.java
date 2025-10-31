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
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DateAdapter extends RecyclerView.Adapter<DateAdapter.VH> {

    public interface OnSelect { void onSelect(String yyyyMMdd); }

    private final List<String> days = new ArrayList<>(); // "yyyy-MM-dd"
    private int selected = 0;
    private final OnSelect cb;

    private final SimpleDateFormat isoFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
    private final Calendar cal = Calendar.getInstance();

    public DateAdapter(OnSelect cb) { this.cb = cb; }

    public void submit(List<String> list) {
        days.clear();
        if (list != null) days.addAll(list);
        selected = 0;
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_date_chip, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        String d = days.get(pos); // yyyy-MM-dd

        try {
            Date date = isoFmt.parse(d);
            cal.setTime(date);

            // số ngày
            h.tvDayNum.setText(String.format(Locale.getDefault(), "%02d",
                    cal.get(Calendar.DAY_OF_MONTH)));

            // chữ dưới: Hôm nay / CN / T2..T7
            String todayStr = isoFmt.format(new Date());
            boolean isToday = d.equals(todayStr);
            h.tvDaySub.setText(isToday ? "Hôm nay" : mapDowVi(cal.get(Calendar.DAY_OF_WEEK)));

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
            if (cb != null) cb.onSelect(days.get(selected));
        });
    }

    @Override
    public int getItemCount() { return days.size(); }

    private static String mapDowVi(int dow) {
        switch (dow) {
            case Calendar.MONDAY:    return "Thứ 2";
            case Calendar.TUESDAY:   return "Thứ 3";
            case Calendar.WEDNESDAY: return "Thứ 4";
            case Calendar.THURSDAY:  return "Thứ 5";
            case Calendar.FRIDAY:    return "Thứ 6";
            case Calendar.SATURDAY:  return "Thứ 7";
            case Calendar.SUNDAY:    return "Chủ nhật ";
            default:                  return "";
        }
    }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvDayNum, tvDaySub;
        VH(View v) {
            super(v);
            tvDayNum = v.findViewById(R.id.tvDayNum);
            tvDaySub = v.findViewById(R.id.tvDaySub);
        }
    }
}
