package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.Model.MovieGroup;
import com.example.datn_md_13.Model.ShowtimeSlot;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.List;

public class MovieShowtimesAdapter extends RecyclerView.Adapter<MovieShowtimesAdapter.VH> {

    public interface OnPick { void onPick(ShowtimeSlot s); }

    private final List<MovieGroup> data = new ArrayList<>();
    private final OnPick cb;

    public MovieShowtimesAdapter(OnPick cb) { this.cb = cb; }

    public void submit(List<MovieGroup> list) {
        data.clear();
        if (list != null) data.addAll(list);
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_movie_showtimes, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        MovieGroup g = data.get(pos);

        // Poster
        if (g.movie != null && g.movie.poster != null && !g.movie.poster.isEmpty()) {
            Glide.with(h.ivPoster.getContext()).load(g.movie.poster).into(h.ivPoster);
        } else {
            h.ivPoster.setImageDrawable(null);
        }

        // Title + meta
        h.tvTitle.setText(g.movie != null && g.movie.title != null ? g.movie.title : "");
        String genres = (g.movie != null && g.movie.genre != null) ? String.join(", ", g.movie.genre) : "";
        String duration = (g.movie != null && g.movie.duration != null) ? (g.movie.duration + " phút") : "";
        String meta = genres.isEmpty() ? duration : (duration.isEmpty() ? genres : (genres + " • " + duration));
        h.tvMeta.setText(meta);

        // Room type hiển thị theo slot đầu (đủ dùng nếu cùng loại)
        String type = (g.showtimes != null && !g.showtimes.isEmpty() && g.showtimes.get(0).room_type != null)
                ? g.showtimes.get(0).room_type : "2D";
        h.tvRoomType.setText(type + " Phụ đề"); // tuỳ bạn đổi "Phụ đề"

        // Times horizontal list
        TimesAdapter tAdapter = new TimesAdapter(cb::onPick);
        h.rvTimes.setLayoutManager(new LinearLayoutManager(h.rvTimes.getContext(),
                RecyclerView.HORIZONTAL, false));
        h.rvTimes.setAdapter(tAdapter);
        tAdapter.submit(g.showtimes);
    }

    @Override
    public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        ImageView ivPoster;
        TextView tvTitle, tvMeta, tvRoomType;
        RecyclerView rvTimes;

        VH(@NonNull View v) {
            super(v);
            ivPoster = v.findViewById(R.id.ivPoster);
            tvTitle  = v.findViewById(R.id.tvTitle);
            tvMeta   = v.findViewById(R.id.tvMeta);
            tvRoomType = v.findViewById(R.id.tvRoomType);
            rvTimes  = v.findViewById(R.id.rvTimes);
        }
    }
}
