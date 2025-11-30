package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.R;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ProductQtyAdapter extends RecyclerView.Adapter<ProductQtyAdapter.VH> {

    public interface OnChanged { void onChanged(); }

    /* ============================
           ROW MODEL
       ============================ */
    public static class Row {
        public String id;
        public String name;
        public String type;  // combo | drink | popcorn
        public int price;
        public int qty;
        public String image;
    }

    private final List<Row> data = new ArrayList<>();
    private final OnChanged cb;

    public ProductQtyAdapter(OnChanged cb) {
        this.cb = cb;
    }

    /* ============================
            SET DATA
       ============================ */
    public void setItems(List<Row> rows) {
        data.clear();
        if (rows != null) data.addAll(rows);
        notifyDataSetChanged();
        if (cb != null) cb.onChanged();
    }

    /* ============================
          LẤY ITEM ĐÃ CHỌN
       ============================ */
    public List<Row> getSelected() {
        List<Row> out = new ArrayList<>();
        for (Row r : data)
            if (r.qty > 0) out.add(r);
        return out;
    }

    /* ============================
           CREATE VIEW HOLDER
       ============================ */
    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup p, int vt) {
        View v = LayoutInflater.from(p.getContext())
                .inflate(R.layout.item_product_qty, p, false);
        return new VH(v);
    }

    /* ============================
           BIND VIEW HOLDER
       ============================ */
    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        Row r = data.get(pos);

        h.tvName.setText(r.name);
        h.tvPrice.setText(
                NumberFormat.getNumberInstance(new Locale("vi", "VN"))
                        .format(r.price) + " đ"
        );
        h.tvQty.setText(String.valueOf(r.qty));

        // ⭐ LOAD ẢNH SẢN PHẨM
        Glide.with(h.itemView.getContext())
                .load(r.image)                         // URL từ backend
                .placeholder(R.drawable.logo)
                .error(R.drawable.logo)
                // lỗi thì dùng ảnh này
                .into(h.imgProduct);

        h.btnPlus.setOnClickListener(v -> {
            r.qty++;
            h.tvQty.setText(String.valueOf(r.qty));
            if (cb != null) cb.onChanged();
        });

        h.btnMinus.setOnClickListener(v -> {
            if (r.qty > 0) {
                r.qty--;
                h.tvQty.setText(String.valueOf(r.qty));
                if (cb != null) cb.onChanged();
            }
        });
    }

    @Override
    public int getItemCount() { return data.size(); }

    /* ============================
             VIEW HOLDER
       ============================ */
    static class VH extends RecyclerView.ViewHolder {
        TextView tvName, tvPrice, tvQty;
        ImageView imgProduct;
        View btnPlus, btnMinus;

        VH(@NonNull View v) {
            super(v);
            tvName = v.findViewById(R.id.tvName);
            tvPrice = v.findViewById(R.id.tvPrice);
            tvQty = v.findViewById(R.id.tvQty);
            imgProduct = v.findViewById(R.id.imgProduct);
            btnPlus = v.findViewById(R.id.btnPlus);
            btnMinus = v.findViewById(R.id.btnMinus);
        }
    }
}
