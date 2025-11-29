package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.DateAdapter;
import com.example.datn_md_13.Adapter.MovieShowtimesAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.AuthManager;
import com.example.datn_md_13.Model.ShowtimesByCinemaResponse;
import com.example.datn_md_13.Model.ShowtimeSlot;
import com.example.datn_md_13.R;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.progressindicator.CircularProgressIndicator;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ShowtimesByCinemaActivity extends AppCompatActivity {

    private ApiService api;
    private String cinemaId, cinemaName, selectedDate;
    private String selectedType = null; // "2D" | "3D" | "IMAX" | null

    private CircularProgressIndicator progress;
    private MovieShowtimesAdapter movieAdapter;
    private DateAdapter dateAdapter;

    // chống gọi API chồng lên nhau + chống callback chip lần đầu
    private Call<ShowtimesByCinemaResponse> inFlight;
    private boolean initChips = false;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_showtimes_by_cinema);

        cinemaId = getIntent().getStringExtra("cinema_id");
        cinemaName = getIntent().getStringExtra("cinema_name");

        // Toolbar
        MaterialToolbar bar = findViewById(R.id.topAppBar);
        bar.setNavigationOnClickListener(v -> onBackPressed());
        TextView tvCinemaName = findViewById(R.id.tvCinemaName);
        if (tvCinemaName != null) tvCinemaName.setText(cinemaName);

        progress = findViewById(R.id.progress);
        api = ApiClient.get().create(ApiService.class);

        // ==== DATES ====
        RecyclerView rvDates = findViewById(R.id.rvDates);
        rvDates.setLayoutManager(
                new LinearLayoutManager(this, RecyclerView.HORIZONTAL, false)
        );
        dateAdapter = new DateAdapter(d -> {
            if (d != null && !d.equals(selectedDate)) {
                selectedDate = d;
                load(); // đổi ngày -> gọi API
            }
        });
        rvDates.setAdapter(dateAdapter);
        dateAdapter.submit(next7Days());

        if (selectedDate == null) {
            selectedDate = today();
        }

        // ==== TYPE CHIPS ====
        ChipGroup chipType = findViewById(R.id.chipType);
        Chip chip2D = findViewById(R.id.chip2D);
        Chip chip3D = findViewById(R.id.chip3D);
        Chip chipIMAX = findViewById(R.id.chipIMAX);

        if (chipType != null) {
            chipType.setSingleSelection(true);
            chipType.setOnCheckedStateChangeListener((group, ids) -> {
                // Lần đầu setChecked(true) sẽ nhảy vào đây -> bỏ qua
                if (!initChips) return;

                if (ids == null || ids.isEmpty()) {
                    selectedType = null;
                } else {
                    int id = ids.get(0);
                    if (id == R.id.chip2D) {
                        selectedType = "2D";
                    } else if (id == R.id.chip3D) {
                        selectedType = "3D";
                    } else if (id == R.id.chipIMAX) {
                        selectedType = "IMAX";
                    } else {
                        selectedType = null;
                    }
                }
                load(); // đổi loại phòng -> reload API
            });
        }

        // chọn mặc định 2D
        if (chip2D != null) {
            chip2D.setChecked(true);   // listener sẽ bị gọi nhưng initChips = false nên không làm gì
        }
        selectedType = "2D";
        initChips = true;              // từ giờ trở đi bấm chip mới xử lý

        // ==== MOVIE + SHOWTIMES LIST ====
        RecyclerView rvMovies = findViewById(R.id.rvMovies);
        rvMovies.setLayoutManager(new LinearLayoutManager(this));
        movieAdapter = new MovieShowtimesAdapter(this::onPickShowtime);
        rvMovies.setAdapter(movieAdapter);

        // gọi lần đầu
        load();
    }

    private void load() {
        if (progress != null) progress.setVisibility(View.VISIBLE);

        // huỷ call cũ nếu đang chạy
        if (inFlight != null && !inFlight.isCanceled()) {
            inFlight.cancel();
        }

        inFlight = api.getShowtimesByCinema(cinemaId, selectedDate, selectedType);
        inFlight.enqueue(new Callback<ShowtimesByCinemaResponse>() {
            @Override
            public void onResponse(Call<ShowtimesByCinemaResponse> call,
                                   Response<ShowtimesByCinemaResponse> res) {
                if (progress != null) progress.setVisibility(View.GONE);

                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(ShowtimesByCinemaActivity.this,
                            "Lỗi tải suất chiếu", Toast.LENGTH_SHORT).show();
                    return;
                }

                movieAdapter.submit(res.body().movies);
            }

            @Override
            public void onFailure(Call<ShowtimesByCinemaResponse> call, Throwable t) {
                if (progress != null) progress.setVisibility(View.GONE);
                if (call.isCanceled()) return; // bị huỷ vì load mới, bỏ qua
                Toast.makeText(ShowtimesByCinemaActivity.this,
                        "Không thể kết nối", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void onPickShowtime(ShowtimeSlot s) {

        if (!AuthManager.isLoggedIn(this)) {

            showErrorDialog(
                    "Bạn chưa đăng nhập",
                    "Vui lòng đăng nhập để tiếp tục đặt vé.",
                    () -> {
                        // 🔥 Chỉ chạy khi user bấm OK
                        Intent i = new Intent(this, com.example.datn_md_13.Activity.Login.class);
                        startActivity(i);
                    }
            );

            return;
        }

        // Đã login → mở màn chọn ghế
        Intent i = new Intent(this, Activity_seat_selection.class);
        i.putExtra("showtime_id", s.id);

        if (s.ticket_price != null) {
            i.putExtra("ticket_price", s.ticket_price.intValue());
        }

        startActivity(i);
    }



    private static String today() {
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat(
                "yyyy-MM-dd", java.util.Locale.getDefault()
        );
        return f.format(new java.util.Date());
    }
    private void showErrorDialog(String title, String msg, Runnable onOk) {
        View view = getLayoutInflater().inflate(R.layout.custom_dialog_error, null);

        TextView tvTitle = view.findViewById(R.id.tvTitle);
        TextView tvMessage = view.findViewById(R.id.tvMessage);
        Button btnOk = view.findViewById(R.id.btnOk);

        tvTitle.setText(title);
        tvMessage.setText(msg);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(view)
                .create();

        if (dialog.getWindow() != null)
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));

        btnOk.setOnClickListener(v -> {
            dialog.dismiss();
            if (onOk != null) onOk.run();
        });

        dialog.show();
    }


    private static List<String> next7Days() {
        List<String> ds = new ArrayList<>();
        java.util.Calendar c = java.util.Calendar.getInstance();
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat(
                "yyyy-MM-dd", java.util.Locale.getDefault()
        );
        for (int i = 0; i < 7; i++) {
            ds.add(f.format(c.getTime()));
            c.add(java.util.Calendar.DAY_OF_MONTH, 1);
        }
        return ds;
    }
}
