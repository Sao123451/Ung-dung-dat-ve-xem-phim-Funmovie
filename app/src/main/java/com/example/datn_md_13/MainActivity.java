package com.example.datn_md_13;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.TextView;
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
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.example.datn_md_13.auth.AuthManager;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.imageview.ShapeableImageView;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private RecyclerView rvBanner;
    private View mainContainer;
    private BottomNavigationView bottom;

    // ====== HEADER refs ======
    private View headerRoot;              // headerCard trong activity_main.xml
    private View headerGuest;             // R.id.header_guest
    private View headerUser;              // R.id.header_user
    private TextView tvGreeting;          // R.id.tvGreeting
    private ShapeableImageView ivAvatar;  // R.id.ivAvatar
    private View btnGoLogin;              // R.id.btnGoLogin

    private BannerAdapter bannerAdapter;

    // Item hiển thị banner
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

        // ====== Views ======
        rvBanner      = findViewById(R.id.rv_banner);
        mainContainer = findViewById(R.id.main_container);
        bottom        = findViewById(R.id.bottom_nav);

        // Header nằm trực tiếp trong activity_main.xml
        headerRoot = findViewById(R.id.headerCard);
        if (headerRoot != null) {
            headerGuest = headerRoot.findViewById(R.id.header_guest);
            headerUser  = headerRoot.findViewById(R.id.header_user);
            tvGreeting  = headerRoot.findViewById(R.id.tvGreeting);
            ivAvatar    = headerRoot.findViewById(R.id.ivAvatar);
            btnGoLogin  = headerRoot.findViewById(R.id.btnGoLogin);

            if (btnGoLogin != null) {
                btnGoLogin.setOnClickListener(v ->
                        startActivity(new Intent(MainActivity.this,
                                com.example.datn_md_13.Activity.Login.class))
                );
            }

            if (headerUser != null) {
                headerUser.setOnClickListener(v -> {
                    // Chỉ điều hướng nếu đã đăng nhập (phòng trường hợp setVisibility nhầm)
                    if (com.example.datn_md_13.auth.AuthManager.isLoggedIn(MainActivity.this)) {
                        startActivity(new Intent(MainActivity.this,
                                com.example.datn_md_13.Activity.Activity_member.class)); // hoặc Activity_member.class
                    }
                });
            }
        }

        // ====== Insets ======
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

        // ====== Banner ======
        rvBanner.setLayoutManager(new LinearLayoutManager(this, RecyclerView.HORIZONTAL, false));
        new PagerSnapHelper().attachToRecyclerView(rvBanner);
        bannerAdapter = new BannerAdapter();
        rvBanner.setAdapter(bannerAdapter);
        loadBanners();

        // ====== Bottom nav ======
        bottom.setOnItemSelectedListener(item -> {
            Fragment f = new HomeFragment();
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.main_container, f)
                    .commit();
            return true;
        });
        if (savedInstanceState == null) bottom.setSelectedItemId(R.id.nav_home);
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderHeader(); // cập nhật header theo cờ đăng nhập
    }

    // ====== HEADER logic ======
    private void renderHeader() {
        if (headerRoot == null) return;

        if (!AuthManager.isLoggedIn(this)) {
            // Chưa đăng nhập
            if (headerGuest != null) headerGuest.setVisibility(View.VISIBLE);
            if (headerUser != null) headerUser.setVisibility(View.GONE);
            return;
        }

        // Đã đăng nhập
        if (headerGuest != null) headerGuest.setVisibility(View.GONE);
        if (headerUser  != null) headerUser.setVisibility(View.VISIBLE);

        User u = AuthManager.getUser(this);
        String name = getDisplayName(u);
        if (tvGreeting != null) tvGreeting.setText("Chào " + name);

        if (ivAvatar != null) {
            if (u != null && u.getAvatar() != null && !u.getAvatar().trim().isEmpty()) {
                Glide.with(this).load(u.getAvatar()).into(ivAvatar);
            } else {
                ivAvatar.setImageResource(R.drawable.bg_avatar_placeholder);
            }
        }
    }

    // Ưu tiên full_name -> username -> phần trước @ của email; viết hoa đầu mỗi từ
    private String getDisplayName(User u) {
        if (u == null) return "Bạn";

        String name = null;

        // Ưu tiên username -> full_name -> phần trước @ của email
        if (u.getUsername() != null && !u.getUsername().trim().isEmpty()) {
            name = u.getUsername().trim();
        } else if (u.getFull_name() != null && !u.getFull_name().trim().isEmpty()) {
            name = u.getFull_name().trim();
        } else if (u.getEmail() != null && !u.getEmail().trim().isEmpty()) {
            String email = u.getEmail().trim();
            int at = email.indexOf('@');
            name = (at > 0) ? email.substring(0, at) : email;
        }

        if (name == null || name.isEmpty()) return "Bạn";

        // Viết hoa chữ cái đầu mỗi từ (ví dụ: "nam anh" → "Nam Anh")
        String[] parts = name.toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            sb.append(Character.toUpperCase(p.charAt(0)))
                    .append(p.length() > 1 ? p.substring(1) : "")
                    .append(" ");
        }
        return sb.toString().trim();
    }


    // ====== Banner helpers ======
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
                        it.imageUrl = img.image_url; // map đúng key backend
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

    // ====== Banner Adapter ======
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
                    Intent i = new Intent(v.getContext(), com.example.datn_md_13.activity_movie_detail.class);
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
