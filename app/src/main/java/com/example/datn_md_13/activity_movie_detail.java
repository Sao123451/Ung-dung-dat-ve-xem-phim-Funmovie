package com.example.datn_md_13;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Movie;
import com.google.android.material.appbar.MaterialToolbar;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class activity_movie_detail extends AppCompatActivity {

    public static final String EXTRA_MOVIE_ID = "movie_id";

    private ImageView ivPoster, ivThumb;
    private TextView tvTitle, tvMeta, tvDirector, tvCast, tvStatus, tvDesc;
    private TextView tvGenre, tvDuration, tvLanguage, tvRelease;

    private String movieId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_movie_detail);

        // Toolbar + nút back
        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v ->
                getOnBackPressedDispatcher().onBackPressed()  // hoặc: finish();
        );

        // Ánh xạ view
        ivPoster   = findViewById(R.id.ivPoster);
        ivThumb    = findViewById(R.id.ivThumb);

        tvTitle    = findViewById(R.id.tvTitle);
        tvMeta     = findViewById(R.id.tvMeta);      // meta trên card: "Thể loại | xx phút"
        tvDirector = findViewById(R.id.tvDirector);
        tvCast     = findViewById(R.id.tvCast);
        tvStatus   = findViewById(R.id.tvStatus);
        tvDesc     = findViewById(R.id.tvDesc);

        tvGenre    = findViewById(R.id.tvGenre);
        tvDuration = findViewById(R.id.tvDuration);
        tvLanguage = findViewById(R.id.tvLanguage);
        tvRelease  = findViewById(R.id.tvRelease);

        // Nhận id phim
        movieId = getIntent().getStringExtra(EXTRA_MOVIE_ID);
        if (isEmpty(movieId)) {
            Toast.makeText(this, "Thiếu movie_id", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // Gọi API
        loadMovie();
    }

    private void loadMovie() {
        ApiService api = ApiClient.get().create(ApiService.class);
        api.getMovieById(movieId).enqueue(new Callback<Movie>() {
            @Override public void onResponse(@NonNull Call<Movie> call, @NonNull Response<Movie> res) {
                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(activity_movie_detail.this, "Không tải được chi tiết phim", Toast.LENGTH_SHORT).show();
                    finish();
                    return;
                }
                bind(res.body());
            }

            @Override public void onFailure(@NonNull Call<Movie> call, @NonNull Throwable t) {
                Toast.makeText(activity_movie_detail.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                finish();
            }
        });
    }

    private void bind(Movie m) {
        String genre    = joinOrDash(m.genre);
        String duration = m.duration != null ? (m.duration + " phút") : "—";
        String language = safe(m.language);
        String release  = (m.releaseDate != null)
                ? new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(m.releaseDate)
                : "—";

        // Chuyển đổi trạng thái sang tiếng Việt
        String statusLabel;
        switch (safe(m.status)) {
            case "now_showing":
                statusLabel = "Đang chiếu";
                break;
            case "coming":
                statusLabel = "Sắp chiếu";
                break;
            case "early":
                statusLabel = "Suất chiếu sớm";
                break;
            default:
                statusLabel = "Không xác định";
                break;
        }

        // Card trên
        tvTitle.setText(safe(m.title));
        tvMeta.setText(genre + " | " + duration);

        // Bảng 2 cột
        tvDirector.setText(safe(m.director));
        tvCast.setText(joinOrDash(m.cast));
        tvStatus.setText(statusLabel);   // 👈 Ở đây sẽ hiển thị tiếng Việt
        tvGenre.setText(genre);
        tvDuration.setText(duration);
        tvLanguage.setText(language);
        tvRelease.setText(release);

        // Mô tả
        tvDesc.setText(safe(m.description));

        // Ảnh
        Glide.with(this).load(m.poster).centerCrop().into(ivPoster);
        Glide.with(this).load(m.poster).centerCrop().into(ivThumb);
    }


    // -------- Helpers --------
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
