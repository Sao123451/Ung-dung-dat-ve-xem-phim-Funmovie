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
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.MovieGroup;
import com.example.datn_md_13.Model.Seat;
import com.example.datn_md_13.Model.ShowtimeSeatResponse;
import com.example.datn_md_13.Model.ShowtimeSlot;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MovieShowtimesAdapter extends RecyclerView.Adapter<MovieShowtimesAdapter.VH> {

    public interface OnPick { void onPick(ShowtimeSlot s); }

    private final List<MovieGroup> data = new ArrayList<>();
    private final OnPick cb;

    // ✅ Cache số ghế để tránh nhảy 98→100 khi recycle
    private final Map<String, Integer> availableCache = new HashMap<>();

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
        return new VH(v, cb);
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

        // Loại phòng hiển thị theo slot đầu (nếu có)
        String type = (g.showtimes != null && !g.showtimes.isEmpty() && g.showtimes.get(0).room_type != null)
                ? g.showtimes.get(0).room_type : "2D";
        h.tvRoomType.setText(type + " Phụ đề");

        // Times list
        List<ShowtimeSlot> slots = (g.showtimes != null) ? g.showtimes : new ArrayList<>();
        h.bindTimes(slots);

        // Khởi tạo hiển thị seats từ cache trước (nếu có)
        for (ShowtimeSlot s : slots) {
            Integer cached = availableCache.get(s.id);
            if (cached != null) {
                h.timesAdapter.updateAvailableById(s.id, cached);
            }
        }

        // 🔥 Gọi API để lấy số ghế thực tế cho từng suất (cập nhật theo ID)
        ApiService api = ApiClient.get().create(ApiService.class);
        for (ShowtimeSlot s : slots) {
            final String slotId = s.id;
            api.getSeatsByShowtime(slotId).enqueue(new Callback<ShowtimeSeatResponse>() {
                @Override
                public void onResponse(@NonNull Call<ShowtimeSeatResponse> call,
                                       @NonNull Response<ShowtimeSeatResponse> res) {
                    if (!res.isSuccessful() || res.body() == null || res.body().seats == null) return;

                    int available = 0;
                    for (Seat seat : res.body().seats) {
                        String st = seat.resolvedStatus(); // available | holding | sold | broken
                        if (!"sold".equalsIgnoreCase(st)
                                && !"broken".equalsIgnoreCase(st)
                                && !"holding".equalsIgnoreCase(st)) {
                                available++;   // chỉ đếm available
                        }
                    }



                    // Lưu cache và cập nhật item theo ID để tránh nhảy số khi recycle
                    availableCache.put(slotId, available);
                    h.timesAdapter.updateAvailableById(slotId, available);
                }

                @Override public void onFailure(@NonNull Call<ShowtimeSeatResponse> call, @NonNull Throwable t) { /* no-op */ }
            });
        }
    }

    @Override
    public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        ImageView ivPoster;
        TextView tvTitle, tvMeta, tvRoomType;
        RecyclerView rvTimes;

        final TimesAdapter timesAdapter;

        VH(@NonNull View v, OnPick cb) {
            super(v);
            ivPoster   = v.findViewById(R.id.ivPoster);
            tvTitle    = v.findViewById(R.id.tvTitle);
            tvMeta     = v.findViewById(R.id.tvMeta);
            tvRoomType = v.findViewById(R.id.tvRoomType);
            rvTimes    = v.findViewById(R.id.rvTimes);

            rvTimes.setLayoutManager(new LinearLayoutManager(v.getContext(),
                    RecyclerView.HORIZONTAL, false));
            timesAdapter = new TimesAdapter(slot -> cb.onPick(slot));

            rvTimes.setAdapter(timesAdapter);
        }

        void bindTimes(List<ShowtimeSlot> slots) {
            timesAdapter.submit(slots);
        }
    }
}
