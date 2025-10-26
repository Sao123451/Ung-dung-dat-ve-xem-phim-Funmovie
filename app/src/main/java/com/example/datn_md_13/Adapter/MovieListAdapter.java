package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.LayoutRes;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.example.datn_md_13.R;
import com.example.datn_md_13.Model.Movie;
import java.text.SimpleDateFormat;
import java.util.*;

public class MovieListAdapter extends RecyclerView.Adapter<MovieListAdapter.VH> {
    private final List<Movie> data = new ArrayList<>();
    private final @LayoutRes int layoutRes; // <-- ép layout
    private final String typeKey;            // "coming" | "now" | "early"
    private final SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());

    public MovieListAdapter(@LayoutRes int layoutRes, String typeKey) {
        this.layoutRes = layoutRes;
        this.typeKey = typeKey;
    }

    public void submit(List<Movie> list) {
        data.clear();
        if (list != null) data.addAll(list);
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(layoutRes, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int i) {
        Movie m = data.get(i);

        // Dùng null-check để dùng được cho cả 2 layout
        if (h.tvTitle != null)  h.tvTitle.setText(m.title != null ? m.title : "");
        if (h.tvTitle2 != null) h.tvTitle2.setText(m.title != null ? m.title : "");

        if ("coming".equals(typeKey)) {
            if (h.tvDate != null) {
                h.tvDate.setText(m.releaseDate != null
                        ? "Khởi chiếu: " + sdf.format(m.releaseDate)
                        : "Khởi chiếu: Chưa rõ");
            }
        } else { // now | early
            if (h.tvDuration != null) {
                h.tvDuration.setText("Thời lượng: " + (m.duration != null ? m.duration + " phút" : "—"));
            }
        }

        String poster = m.poster;
        if (h.ivPoster != null) {
            Glide.with(h.itemView.getContext())
                    .load(poster).placeholder(R.drawable.ic_launcher_background).into(h.ivPoster);
        }
        if (h.ivPoster2 != null) {
            Glide.with(h.itemView.getContext())
                    .load(poster).placeholder(R.drawable.ic_launcher_background).into(h.ivPoster2);
        }
    }

    @Override public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        // item_movie (coming)
        ImageView ivPoster; TextView tvTitle, tvDate;
        // item_movie2 (now/early)
        ImageView ivPoster2; TextView tvTitle2, tvDuration;

        VH(@NonNull View v) {
            super(v);
            // lấy theo id; nếu layout không có id đó -> null (ok)
            ivPoster   = v.findViewById(R.id.ivPoster);
            tvTitle    = v.findViewById(R.id.tvTitle);
            tvDate     = v.findViewById(R.id.tvDate);
            ivPoster2  = v.findViewById(R.id.ivPoster2);
            tvTitle2   = v.findViewById(R.id.tvTitle2);
            tvDuration = v.findViewById(R.id.tvDuration);
        }
    }
}
