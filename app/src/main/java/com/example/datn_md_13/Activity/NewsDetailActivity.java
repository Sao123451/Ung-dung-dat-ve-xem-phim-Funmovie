package com.example.datn_md_13.Activity;

import android.os.Bundle;
import android.text.Spanned;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.text.HtmlCompat;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.News;
import com.example.datn_md_13.R;
import com.google.android.material.imageview.ShapeableImageView;

import java.text.SimpleDateFormat;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NewsDetailActivity extends AppCompatActivity {

    private ApiService api;
    private ShapeableImageView imgCover;
    private Toolbar toolbar;
    private TextView tvTitle, tvDate, tvContent;
    private final SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_news_detail);

        api = ApiClient.api();

        toolbar = findViewById(R.id.toolbarDetail);
        imgCover = findViewById(R.id.imgCover);
        tvTitle  = findViewById(R.id.tvTitle);
        tvDate   = findViewById(R.id.tvDate);
        tvContent= findViewById(R.id.tvContent);

        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> onBackPressed());

        String title = getIntent().getStringExtra("title");
        if (title != null) {
            toolbar.setTitle(title);
        }

        String idOrSlug = getIntent().getStringExtra("slug");
        if (idOrSlug == null) {
            Toast.makeText(this, "Thiếu tham số", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        load(idOrSlug);
    }

    private void load(String idOrSlug) {
        api.getNewsDetail(idOrSlug).enqueue(new Callback<News>() {
            @Override
            public void onResponse(@NonNull Call<News> call, @NonNull Response<News> response) {
                if (!response.isSuccessful() || response.body() == null) {
                    Toast.makeText(NewsDetailActivity.this, "Không tìm thấy bài viết", Toast.LENGTH_SHORT).show();
                    finish();
                    return;
                }

                News n = response.body();

                tvTitle.setText(n.title);
                tvDate.setText(n.publishedAt != null ? df.format(n.publishedAt) : "");

                Spanned html = HtmlCompat.fromHtml(
                        n.content != null ? n.content : "",
                        HtmlCompat.FROM_HTML_MODE_LEGACY
                );
                tvContent.setText(html);

                Glide.with(NewsDetailActivity.this)
                        .load(ApiClient.absolutePublicUrl(n.coverImage))
                        .placeholder(R.drawable.bg_avatar_circle)
                        .error(R.drawable.bg_avatar_circle)
                        .into(imgCover);
            }

            @Override
            public void onFailure(@NonNull Call<News> call, @NonNull Throwable t) {
                Toast.makeText(NewsDetailActivity.this, "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
