package com.example.datn_md_13.Adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Model.UserVoucherItem;
import com.example.datn_md_13.R;

import java.util.List;

public class VoucherAdapter extends RecyclerView.Adapter<VoucherAdapter.VH> {

    private final Context context;
    private List<UserVoucherItem> list;

    public VoucherAdapter(Context context, List<UserVoucherItem> list) {
        this.context = context;
        this.list = list;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(context).inflate(R.layout.item_voucher, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        UserVoucherItem v = list.get(pos);

        h.tvCode.setText(v.code);

        // hiển thị giảm %
        if ("percent".equalsIgnoreCase(v.type)) {
            h.tvDiscount.setText("Giảm " + v.value + "%");
        } else {
            h.tvDiscount.setText("Giảm " + v.value + "₫");
        }

        // HSD
        if (v.end_date == null) {
            h.tvEndDate.setText("Không giới hạn");
        } else {
            h.tvEndDate.setText("HSD: " + v.end_date.substring(0, 10));
        }

        // Số lượt
        if (v.usage_limit == 0) {
            h.tvUsage.setText("Không giới hạn lượt");
        } else {
            h.tvUsage.setText("Đã dùng: " + v.used_count + "/" + v.usage_limit);
        }

        // used → đổi màu hoặc thêm text
        if (v.used) {
            h.tvUsed.setVisibility(View.VISIBLE);
            h.tvUsed.setText("Đã sử dụng");
        } else {
            h.tvUsed.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class VH extends RecyclerView.ViewHolder {
        TextView tvCode, tvDiscount, tvEndDate, tvUsage, tvUsed;

        public VH(@NonNull View v) {
            super(v);
            tvCode = v.findViewById(R.id.tvCode);
            tvDiscount = v.findViewById(R.id.tvDiscount);
            tvEndDate = v.findViewById(R.id.tvEndDate);
            tvUsage = v.findViewById(R.id.tvUsage);
            tvUsed = v.findViewById(R.id.tvUsed);
        }
    }
}
