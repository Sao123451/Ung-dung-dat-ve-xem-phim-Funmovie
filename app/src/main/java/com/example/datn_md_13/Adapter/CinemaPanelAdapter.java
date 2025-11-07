package com.example.datn_md_13.Adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Cinema;
import com.example.datn_md_13.Model.MovieGroup;
import com.example.datn_md_13.Model.Seat;
import com.example.datn_md_13.Model.ShowtimeSeatResponse;
import com.example.datn_md_13.Model.ShowtimeSlot;
import com.example.datn_md_13.Model.ShowtimesByCinemaResponse;
import com.example.datn_md_13.R;
import com.google.android.material.chip.ChipGroup;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CinemaPanelAdapter extends RecyclerView.Adapter<CinemaPanelAdapter.VH> {

    public interface OnPick { void onPick(ShowtimeSlot slot); }

    private final List<Cinema> data = new ArrayList<>();
    private final OnPick cb;
    private String currentDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            .format(new java.util.Date());

    public CinemaPanelAdapter(OnPick cb){ this.cb = cb; }

    public void setFilter(String yyyyMMdd, String ignoredType){
        currentDate = yyyyMMdd;
        notifyDataSetChanged();
    }

    public void submit(List<Cinema> cinemas){
        data.clear();
        if (cinemas!=null) data.addAll(cinemas);
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup p, int v) {
        View view = LayoutInflater.from(p.getContext())
                .inflate(R.layout.item_cinema_panel, p, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        Cinema c = data.get(pos);
        h.tvCinemaName.setText(c.getName());

        // mặc định: ĐÓNG
        h.rvTimes.setVisibility(View.GONE);
        h.chipTypeInCard.setVisibility(View.GONE);
        h.ivToggle.setRotation(0f);

        // list giờ
        h.rvTimes.setLayoutManager(new LinearLayoutManager(
                h.rvTimes.getContext(), RecyclerView.HORIZONTAL, false));
        TimesAdapter tAdapter = new TimesAdapter(cb::onPick);
        h.rvTimes.setAdapter(tAdapter);

        // đổi chip => nếu đang mở thì reload
        h.chipTypeInCard.setOnCheckedStateChangeListener((group, ids) -> {
            if (h.rvTimes.getVisibility() == View.VISIBLE) {
                loadShowtimesInto(h, c, tAdapter);
            }
        });

        // toggle
        View.OnClickListener toggle = v -> {
            boolean opening = h.rvTimes.getVisibility() != View.VISIBLE;
            h.rvTimes.setVisibility(opening ? View.VISIBLE : View.GONE);
            h.chipTypeInCard.setVisibility(opening ? View.VISIBLE : View.GONE);
            h.ivToggle.setRotation(opening ? 180f : 0f);
            if (opening) loadShowtimesInto(h, c, tAdapter);
        };
        h.itemView.setOnClickListener(toggle);
        h.ivToggle.setOnClickListener(toggle);
    }

    private void loadShowtimesInto(@NonNull VH h, Cinema c, TimesAdapter tAdapter){
        String type = getCheckedType(h); // "2D" | "3D" | "IMAX" | null
        ApiService api = ApiClient.get().create(ApiService.class);
        api.getShowtimesByCinema(c.getId(), currentDate, type)
                .enqueue(new Callback<ShowtimesByCinemaResponse>() {
                    @Override public void onResponse(Call<ShowtimesByCinemaResponse> call,
                                                     Response<ShowtimesByCinemaResponse> res) {
                        if (!res.isSuccessful() || res.body()==null) return;

                        // Gom tất cả slot về 1 list phẳng
                        List<ShowtimeSlot> all = new ArrayList<>();
                        if (res.body().movies != null) {
                            for (MovieGroup g : res.body().movies) {
                                if (g.showtimes != null) all.addAll(g.showtimes);
                            }
                        }
                        tAdapter.submit(all);

                        // 🔥 Hot-fix: đếm ghế còn trống theo data seats của từng suất
                        ApiService api2 = ApiClient.get().create(ApiService.class);
                        for (int i = 0; i < all.size(); i++) {
                            final int idx = i;
                            final ShowtimeSlot slot = all.get(i);
                            api2.getSeatsByShowtime(slot.id)
                                    .enqueue(new Callback<ShowtimeSeatResponse>() {
                                        @Override
                                        public void onResponse(Call<ShowtimeSeatResponse> call,
                                                               Response<ShowtimeSeatResponse> r2) {
                                            if (!r2.isSuccessful() || r2.body()==null || r2.body().seats==null) return;
                                            int available = 0;
                                            for (Seat seat : r2.body().seats) {
                                                String st = seat.resolvedStatus(); // helper trong Seat.java
                                                if (!"sold".equalsIgnoreCase(st)
                                                        && !"broken".equalsIgnoreCase(st)
                                                        && !"holding".equalsIgnoreCase(st)) {
                                                    available++;   // ✅ chỉ đếm available
                                                }
                                            }
                                            // cập nhật lại số ghế cho item idx
                                            tAdapter.updateAvailableAt(idx, available);
                                        }
                                        @Override public void onFailure(Call<ShowtimeSeatResponse> call, Throwable t) { }
                                    });
                        }
                    }
                    @Override public void onFailure(Call<ShowtimesByCinemaResponse> call, Throwable t) { }
                });
    }

    private String getCheckedType(VH h){
        int id = h.chipTypeInCard.getCheckedChipId();
        if (id == R.id.chip2D_in_card) return "2D";
        if (id == R.id.chip3D_in_card) return "3D";
        if (id == R.id.chipIMAX_in_card) return "IMAX";
        return null;
    }

    @Override public int getItemCount(){ return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvCinemaName;
        ImageView ivToggle;
        RecyclerView rvTimes;
        ChipGroup chipTypeInCard;
        VH(@NonNull View v){
            super(v);
            tvCinemaName   = v.findViewById(R.id.tvCinemaName);
            ivToggle       = v.findViewById(R.id.ivToggle);
            rvTimes        = v.findViewById(R.id.rvTimes);
            chipTypeInCard = v.findViewById(R.id.chipTypeInCard);
        }
    }
}
