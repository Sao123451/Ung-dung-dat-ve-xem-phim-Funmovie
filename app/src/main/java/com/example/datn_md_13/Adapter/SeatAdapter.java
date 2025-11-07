package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.example.datn_md_13.Model.SeatVM;
import com.example.datn_md_13.R;
import com.google.android.material.card.MaterialCardView;
import java.util.ArrayList;
import java.util.List;

public class SeatAdapter extends RecyclerView.Adapter<SeatAdapter.VH> {

    public interface OnToggle { void onChange(); }

    private static final int TYPE_NORMAL = 0;
    private static final int TYPE_VIP    = 1;
    private static final int TYPE_COUPLE = 2;

    private final List<SeatVM> data = new ArrayList<>();
    private final OnToggle cb;

    public SeatAdapter(OnToggle cb) { this.cb = cb; }

    public void submit(List<SeatVM> list) {
        data.clear();
        if (list != null) data.addAll(list);
        notifyDataSetChanged();
        if (cb != null) cb.onChange();
    }

    public int getSpanAt(int pos) {
        if (pos < 0 || pos >= data.size()) return 1;
        return Math.max(1, data.get(pos).span);
    }

    public List<SeatVM> getSelected() {
        List<SeatVM> out = new ArrayList<>();
        for (SeatVM s : data)
            if (s.selected && s.isAvailable()) out.add(s); // holding sẽ KHÔNG được tính
        return out;
    }

    public String getSelectedLabels() {
        StringBuilder sb = new StringBuilder();
        for (SeatVM s : getSelected()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(s.label());
        }
        return sb.toString();
    }

    @Override public int getItemViewType(int position) {
        SeatVM s = data.get(position);
        if ("couple".equalsIgnoreCase(s.type) && s.span == 2) return TYPE_COUPLE;
        if ("vip".equalsIgnoreCase(s.type)) return TYPE_VIP;
        return TYPE_NORMAL;
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        int layout = R.layout.item_seat_normal;
        if (viewType == TYPE_VIP) layout = R.layout.item_seat_vip;
        else if (viewType == TYPE_COUPLE) layout = R.layout.item_seat_couple_right;
        View v = LayoutInflater.from(parent.getContext()).inflate(layout, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        SeatVM s = data.get(pos);
        h.tv.setText(s.label());

        final int SOLD    = 0xFFEF5350; // đỏ
        final int HOLDING = 0xFFFFB300; // cam  <-- NEW: màu ghế giữ
        final int BROKEN  = 0xFF212121;
        final int FREE    = 0xFFE0E0E0;
        final int SEL     = 0xFFA5D6A7;

        // trạng thái
        if (s.isBroken()) {
            h.card.setCardBackgroundColor(BROKEN);
            h.tv.setText("X");
            h.tv.setTextColor(0xFFFFFFFF);
            h.itemView.setClickable(false);
            return;
        }
        if (s.isSold()) {
            h.card.setCardBackgroundColor(SOLD);
            h.tv.setTextColor(0xFFFFFFFF);
            h.itemView.setClickable(false);
            return;
        }
        if (s.isHolding()) {                     // <-- NEW: ghế đang giữ
            h.card.setCardBackgroundColor(HOLDING);
            h.tv.setTextColor(0xFF000000);
            h.itemView.setClickable(false);     // không cho click
            return;
        }

        // available
        h.itemView.setClickable(true);
        if (s.selected) {
            h.card.setCardBackgroundColor(SEL);
            h.tv.setTextColor(0xFF000000);
        } else {
            h.card.setCardBackgroundColor(FREE);
            h.tv.setTextColor(0xFF000000);
        }

        h.itemView.setOnClickListener(v -> {
            s.selected = !s.selected;
            notifyItemChanged(h.getAdapterPosition());
            if (cb != null) cb.onChange();
        });
    }

    @Override public int getItemCount() { return data.size(); }

    public static class VH extends RecyclerView.ViewHolder {
        TextView tv;
        MaterialCardView card;
        public VH(@NonNull View v) {
            super(v);
            tv = v.findViewById(R.id.tvLabel);
            card = v.findViewById(R.id.cardSeat);
        }
    }

    public void attachSpanLookup(GridLayoutManager glm) {
        glm.setSpanSizeLookup(new GridLayoutManager.SpanSizeLookup() {
            @Override public int getSpanSize(int position) {
                return getSpanAt(position);
            }
        });
    }
}
