package com.example.datn_md_13;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.Activity.Activity_seat_selection;
import com.example.datn_md_13.Activity.AreaPickerActivity;
import com.example.datn_md_13.Adapter.CinemaPanelAdapter;
import com.example.datn_md_13.Adapter.DateAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Cinema;
import com.example.datn_md_13.Model.Movie;
import com.example.datn_md_13.Model.PublicCinemaResponse;
import com.example.datn_md_13.Model.ShowtimeSlot;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.progressindicator.CircularProgressIndicator;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class BookingByMovieActivity extends AppCompatActivity {

    // Poster + header
    private ImageView ivPoster;
    private TextView tvTitle, tvMeta;
    private MaterialButton btnDetail;
    private CircularProgressIndicator progress;

    // Date + Area + Cinemas
    private RecyclerView rvDates, rvCinemas;
    private TextView tvArea, tvFooter;
    private DateAdapter dateAdapter;
    private CinemaPanelAdapter cinemaAdapter;

    // States
    private String currentMovieId;
    private String selectedDate;
    private String selectedCity = ""; // ""=Tất cả
    private String selectedType = null; // type được chọn trong card nên để null ở đây

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_booking_by_movie);

        // Toolbar + back
        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) getSupportActionBar().setTitle("Đặt vé theo phim");
        toolbar.setNavigationOnClickListener(v -> getOnBackPressedDispatcher().onBackPressed());

        // Inset cho status bar
        View appbar = findViewById(R.id.appbar);
        if (appbar != null) {
            ViewCompat.setOnApplyWindowInsetsListener(appbar, (view, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                view.setPadding(view.getPaddingLeft(), bars.top, view.getPaddingRight(), view.getPaddingBottom());
                return insets;
            });
        }

        // Views - header
        ivPoster  = findViewById(R.id.ivPoster);
        tvTitle   = findViewById(R.id.tvTitle);
        tvMeta    = findViewById(R.id.tvMeta);
        btnDetail = findViewById(R.id.btnDetail);
        progress  = findViewById(R.id.progress);

        // Views - date + area + cinemas
        rvDates   = findViewById(R.id.rvDates);
        rvCinemas = findViewById(R.id.rvCinemas);
        tvArea    = findViewById(R.id.tvArea);
        tvFooter  = findViewById(R.id.tvFooter);

        btnDetail.setEnabled(false);

        // movie id
        String movieId = getIntent().getStringExtra("movie_id");
        if (movieId == null || movieId.trim().isEmpty()) {
            Toast.makeText(this, "Thiếu movie_id", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // ====== Thanh ngày ======
        rvDates.setLayoutManager(new LinearLayoutManager(this, RecyclerView.HORIZONTAL, false));
        dateAdapter = new DateAdapter(d -> {
            if (d != null && !d.equals(selectedDate)) {
                selectedDate = d;
                if (cinemaAdapter != null) cinemaAdapter.setFilter(selectedDate, selectedType);
            }
        });
        rvDates.setAdapter(dateAdapter);
        dateAdapter.submit(next7Days());
        if (selectedDate == null) selectedDate = today();

        // ====== Danh sách rạp ======
        rvCinemas.setLayoutManager(new LinearLayoutManager(this));
        rvCinemas.setNestedScrollingEnabled(false);
        cinemaAdapter = new CinemaPanelAdapter(this::onPickShowtime);
        cinemaAdapter.setFilter(selectedDate, selectedType);
        rvCinemas.setAdapter(cinemaAdapter);

        // ====== Chọn khu vực ======
        View rowArea = findViewById(R.id.rowArea);
        if (rowArea != null) {
            rowArea.setOnClickListener(v -> {
                Intent i = new Intent(this, AreaPickerActivity.class);
                startActivityForResult(i, 1001);
            });
        }

        // load dữ liệu
        loadMovieDetail(movieId);
        loadCinemas();
    }

    // ------- API -------
    private void loadMovieDetail(String movieId) {
        currentMovieId = movieId;
        progress.setVisibility(View.VISIBLE);

        ApiService api = ApiClient.get().create(ApiService.class);
        api.getMovieById(movieId).enqueue(new Callback<Movie>() {
            @Override public void onResponse(@NonNull Call<Movie> call, @NonNull Response<Movie> res) {
                progress.setVisibility(View.GONE);
                if (!res.isSuccessful() || res.body()==null) {
                    Toast.makeText(BookingByMovieActivity.this, "Không tải được thông tin phim", Toast.LENGTH_SHORT).show();
                    return;
                }
                Movie m = res.body();
                tvTitle.setText(m.title == null ? "—" : m.title);
                String genre = (m.genre==null || m.genre.isEmpty()) ? "—"
                        : android.text.TextUtils.join(", ", m.genre);
                String duration = (m.duration!=null) ? (m.duration + " phút") : "—";
                tvMeta.setText(genre + " | " + duration);

                Glide.with(BookingByMovieActivity.this)
                        .load(m.poster)
                        .centerCrop()
                        .into(ivPoster);

                btnDetail.setEnabled(true);
                btnDetail.setOnClickListener(v -> {
                    Intent i = new Intent(BookingByMovieActivity.this, activity_movie_detail.class);
                    i.putExtra(activity_movie_detail.EXTRA_MOVIE_ID, currentMovieId);
                    startActivity(i);
                });
            }
            @Override public void onFailure(@NonNull Call<Movie> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);
                Toast.makeText(BookingByMovieActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadCinemas() {
        progress.setVisibility(View.VISIBLE);
        ApiService api = ApiClient.get().create(ApiService.class);
        api.getCinemasPublic(1, 100, null,
                        (selectedCity==null || selectedCity.isEmpty()) ? null : selectedCity)
                .enqueue(new Callback<PublicCinemaResponse>() {
                    @Override public void onResponse(@NonNull Call<PublicCinemaResponse> call,
                                                     @NonNull Response<PublicCinemaResponse> res) {
                        progress.setVisibility(View.GONE);
                        if (!res.isSuccessful() || res.body()==null || res.body().items==null) {
                            Toast.makeText(BookingByMovieActivity.this, "Không tải được rạp", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        List<Cinema> list = res.body().items;
                        cinemaAdapter.submit(list);
                        if (tvFooter != null) tvFooter.setText("Hiển thị " + list.size() + " rạp");
                    }
                    @Override public void onFailure(@NonNull Call<PublicCinemaResponse> call, @NonNull Throwable t) {
                        progress.setVisibility(View.GONE);
                        Toast.makeText(BookingByMovieActivity.this, "Không thể kết nối", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void onPickShowtime(ShowtimeSlot s) {
        Intent i = new Intent(this, Activity_seat_selection.class);
        i.putExtra("showtime_id", s.id);
        i.putExtra("ticket_price", s.ticket_price != null ? s.ticket_price.intValue() : 0);
        startActivity(i);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1001 && resultCode == RESULT_OK && data != null) {
            selectedCity = data.getStringExtra(AreaPickerActivity.EXTRA_CITY);
            if (tvArea != null) {
                tvArea.setText(selectedCity == null || selectedCity.isEmpty() ? "Tất cả" : selectedCity);
            }
            loadCinemas();
        }
    }

    // ------- helpers -------
    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new java.util.Date());
    }
    private static List<String> next7Days() {
        List<String> ds = new ArrayList<>();
        java.util.Calendar c = java.util.Calendar.getInstance();
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        for (int i = 0; i < 7; i++) {
            ds.add(f.format(c.getTime()));
            c.add(java.util.Calendar.DAY_OF_MONTH, 1);
        }
        return ds;
    }
}
