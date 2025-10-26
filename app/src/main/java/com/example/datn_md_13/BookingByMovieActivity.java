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

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Movie;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.progressindicator.CircularProgressIndicator;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class BookingByMovieActivity extends AppCompatActivity {

    private ImageView ivPoster;
    private TextView tvTitle, tvMeta;
    private MaterialButton btnDetail;
    private CircularProgressIndicator progress;

    private String currentMovieId;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_booking_by_movie);

        // Toolbar + back
        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Đặt vé theo phim");
        }
        toolbar.setNavigationOnClickListener(v ->
                getOnBackPressedDispatcher().onBackPressed()
        );

        // Inset cho status bar (nếu layout có appbar)
        View appbar = findViewById(R.id.appbar);
        if (appbar != null) {
            ViewCompat.setOnApplyWindowInsetsListener(appbar, (view, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                view.setPadding(view.getPaddingLeft(), bars.top, view.getPaddingRight(), view.getPaddingBottom());
                return insets;
            });
        }

        // Views
        ivPoster  = findViewById(R.id.ivPoster);
        tvTitle   = findViewById(R.id.tvTitle);
        tvMeta    = findViewById(R.id.tvMeta);
        btnDetail = findViewById(R.id.btnDetail);
        progress  = findViewById(R.id.progress);

        // Chưa có dữ liệu thì tạm khoá nút Chi tiết
        btnDetail.setEnabled(false);

        // Nhận movie_id
        String movieId = getIntent().getStringExtra("movie_id");
        if (isEmpty(movieId)) {
            Toast.makeText(this, "Thiếu movie_id", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        loadMovieDetail(movieId);
    }

    private void loadMovieDetail(String movieId) {
        currentMovieId = movieId;
        progress.setVisibility(View.VISIBLE);

        ApiService api = ApiClient.get().create(ApiService.class);
        api.getMovieById(movieId).enqueue(new Callback<Movie>() {
            @Override
            public void onResponse(@NonNull Call<Movie> call, @NonNull Response<Movie> response) {
                progress.setVisibility(View.GONE);
                if (!response.isSuccessful() || response.body() == null) {
                    Toast.makeText(BookingByMovieActivity.this, "Không tải được thông tin phim", Toast.LENGTH_SHORT).show();
                    return;
                }

                Movie m = response.body();

                // Gán dữ liệu (null-safe)
                String title    = safe(m.title);
                String genre    = joinOrDash(m.genre);
                String duration = (m.duration != null) ? (m.duration + " phút") : "—";

                tvTitle.setText(title);
                tvMeta.setText(genre + " | " + duration);

                Glide.with(BookingByMovieActivity.this)
                        .load(m.poster)
                        .centerCrop()
                        // .placeholder(R.drawable.bg_placeholder)
                        // .error(R.drawable.bg_placeholder)
                        .into(ivPoster);

                // Bật nút Chi tiết
                btnDetail.setEnabled(true);
                btnDetail.setOnClickListener(v -> {
                    Intent i = new Intent(BookingByMovieActivity.this, activity_movie_detail.class);
                    i.putExtra(activity_movie_detail.EXTRA_MOVIE_ID, currentMovieId);
                    startActivity(i);
                });
            }

            @Override
            public void onFailure(@NonNull Call<Movie> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);
                Toast.makeText(BookingByMovieActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ===== Helpers =====
    private static boolean isEmpty(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String safe(String s) {
        return isEmpty(s) ? "—" : s;
    }

    private static String joinOrDash(List<String> list) {
        return (list == null || list.isEmpty()) ? "—"
                : android.text.TextUtils.join(", ", list);
    }
}
