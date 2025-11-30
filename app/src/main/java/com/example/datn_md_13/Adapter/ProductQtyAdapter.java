package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.R;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ProductQtyAdapter extends RecyclerView.Adapter<ProductQtyAdapter.VH> {

    public interface OnChanged { void onChanged(); }

    public static class Row {
        public String id;
        public String name;
        public String type; // combo | drink | popcorn
        public int price;
        public int qty;
    }

    private final List<Row> data = new ArrayList<>();
    private final OnChanged cb;

    public ProductQtyAdapter(OnChanged cb) { this.cb = cb; }

    public void setItems(List<Row> rows) {
        data.clear();
        if (rows != null) data.addAll(rows);
        notifyDataSetChanged();
        if (cb != null) cb.onChanged(); // load lại quote ngay khi danh sách đổi
    }

    public List<Row> getSelected() {
        List<Row> out = new ArrayList<>();
        for (Row r : data) if (r.qty > 0) out.add(r);   // chỉ lấy item qty>0
        return out;
    }

    @NonNull @Override public VH onCreateViewHolder(@NonNull ViewGroup p, int vt) {
        View v = LayoutInflater.from(p.getContext()).inflate(R.layout.item_product_qty, p, false);
        return new VH(v);
    }

    @Override public void onBindViewHolder(@NonNull VH h, int pos) {
        Row r = data.get(pos);
        h.tvName.setText(r.name);
        h.tvPrice.setText(NumberFormat.getNumberInstance(new Locale("vi","VN")).format(r.price) + " đ");
        h.tvQty.setText(String.valueOf(r.qty));

        h.btnPlus.setOnClickListener(v -> {
            r.qty++;
            h.tvQty.setText(String.valueOf(r.qty));
            if (cb != null) cb.onChanged();             // gọi callback
        });
        h.btnMinus.setOnClickListener(v -> {
            if (r.qty > 0) {
                r.qty--;
                h.tvQty.setText(String.valueOf(r.qty));
                if (cb != null) cb.onChanged();         // gọi callback
            }
        });
    }

    @Override public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvName, tvPrice, tvQty;
        View btnPlus, btnMinus;
        VH(@NonNull View v) {
            super(v);
            tvName = v.findViewById(R.id.tvName);
            tvPrice = v.findViewById(R.id.tvPrice);
            tvQty = v.findViewById(R.id.tvQty);
            btnPlus = v.findViewById(R.id.btnPlus);
            btnMinus = v.findViewById(R.id.btnMinus);
        }
    }
}
