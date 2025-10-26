package com.example.datn_md_13;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.PagerSnapHelper;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Fragment.HomeFragment;
import com.example.datn_md_13.Model.BannerDto;
import com.google.android.material.bottomnavigation.BottomNavigationView;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private RecyclerView rvBanner;
    private View mainContainer;
    private BottomNavigationView bottom;

    private BannerAdapter bannerAdapter;

    // Item hiển thị: giữ url ảnh + movieId để click
    private static class Item {
        String imageUrl;
        String movieId;
    }
    private final List<Item> bannerItems = new ArrayList<>();

    private final Handler autoScrollHandler = new Handler(Looper.getMainLooper());
    private int bannerIndex = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        rvBanner       = findViewById(R.id.rv_banner);
        mainContainer  = findViewById(R.id.main_container);
        bottom         = findViewById(R.id.bottom_nav);

        // Insets
        ViewCompat.setOnApplyWindowInsetsListener(rvBanner, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), bars.top, v.getPaddingRight(), v.getPaddingBottom());
            return insets;
        });
        ViewCompat.setOnApplyWindowInsetsListener(mainContainer, (v, insets) -> insets);
        ViewCompat.setOnApplyWindowInsetsListener(bottom, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bars.bottom);
            return insets;
        });

        // Banner RecyclerView
        rvBanner.setLayoutManager(new LinearLayoutManager(this, RecyclerView.HORIZONTAL, false));
        new PagerSnapHelper().attachToRecyclerView(rvBanner);
        bannerAdapter = new BannerAdapter();
        rvBanner.setAdapter(bannerAdapter);

        // Gọi API banner
        loadBanners();

        // Bottom nav (hiện có Home)
        bottom.setOnItemSelectedListener(item -> {
            Fragment f = new HomeFragment();
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.main_container, f)
                    .commit();
            return true;
        });

        if (savedInstanceState == null) {
            bottom.setSelectedItemId(R.id.nav_home);
        }
    }

    private void setBannerVisible(boolean visible) {
        rvBanner.setVisibility(visible ? View.VISIBLE : View.GONE);
        // Ẩn banner -> main_container ăn top inset
        ViewCompat.setOnApplyWindowInsetsListener(mainContainer, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            int top = visible ? 0 : bars.top;
            v.setPadding(v.getPaddingLeft(), top, v.getPaddingRight(), v.getPaddingBottom());
            return insets;
        });
        ViewCompat.requestApplyInsets(mainContainer);
    }

    private void loadBanners() {
        ApiService api = ApiClient.get().create(ApiService.class);
        api.getAllBanners().enqueue(new Callback<List<BannerDto>>() {
            @Override
            public void onResponse(@NonNull Call<List<BannerDto>> call,
                                   @NonNull Response<List<BannerDto>> response) {
                if (!response.isSuccessful() || response.body() == null) {
                    setBannerVisible(false);
                    Toast.makeText(MainActivity.this, "Không tải được banner", Toast.LENGTH_SHORT).show();
                    return;
                }

                List<BannerDto> data = response.body();

                bannerItems.clear();
                for (BannerDto b : data) {
                    if (b.images == null) continue;
                    for (BannerDto.ImageItem img : b.images) {
                        Item it = new Item();
                        it.imageUrl = img.image_url; // <- map đúng key backend
                        it.movieId  = img.movie_id;  // có thể null
                        bannerItems.add(it);
                    }
                }

                if (bannerItems.isEmpty()) {
                    setBannerVisible(false);
                    autoScrollHandler.removeCallbacksAndMessages(null);
                } else {
                    setBannerVisible(true);
                    bannerAdapter.notifyDataSetChanged();
                    startAutoScroll();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<BannerDto>> call, @NonNull Throwable t) {
                setBannerVisible(false);
                Toast.makeText(MainActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void startAutoScroll() {
        autoScrollHandler.removeCallbacksAndMessages(null);
        if (bannerItems.isEmpty()) return;
        autoScrollHandler.postDelayed(new Runnable() {
            @Override public void run() {
                if (rvBanner.getAdapter() == null || bannerItems.isEmpty()) return;
                bannerIndex = (bannerIndex + 1) % bannerItems.size();
                rvBanner.smoothScrollToPosition(bannerIndex);
                autoScrollHandler.postDelayed(this, 3000);
            }
        }, 3000);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        autoScrollHandler.removeCallbacksAndMessages(null);
    }

    // Adapter banner: load ảnh + click mở chi tiết phim
    private class BannerAdapter extends RecyclerView.Adapter<BannerAdapter.VH> {

        @NonNull @Override
        public VH onCreateViewHolder(@NonNull android.view.ViewGroup parent, int viewType) {
            android.widget.ImageView iv = new android.widget.ImageView(parent.getContext());
            iv.setLayoutParams(new RecyclerView.LayoutParams(
                    RecyclerView.LayoutParams.MATCH_PARENT,
                    RecyclerView.LayoutParams.MATCH_PARENT
            ));
            iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
            return new VH(iv);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            Item it = bannerItems.get(position);
            Glide.with(holder.iv.getContext())
                    .load(it.imageUrl)
                    .centerCrop()

                    .into(holder.iv);

            holder.itemView.setOnClickListener(v -> {
                if (it.movieId != null && !it.movieId.isEmpty()) {
                    android.content.Intent i = new android.content.Intent(
                            v.getContext(), com.example.datn_md_13.activity_movie_detail.class);
                    i.putExtra("movie_id", it.movieId);
                    v.getContext().startActivity(i);
                } else {
                    Toast.makeText(v.getContext(), "Banner này chưa gắn phim", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @Override public int getItemCount() { return bannerItems.size(); }

        class VH extends RecyclerView.ViewHolder {
            android.widget.ImageView iv;
            VH(@NonNull android.view.View itemView) {
                super(itemView);
                iv = (android.widget.ImageView) itemView;
            }
        }
    }
}
