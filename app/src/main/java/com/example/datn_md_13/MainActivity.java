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
import com.example.datn_md_13.Fragment.CinemaByAreaFragment;
import com.example.datn_md_13.Fragment.HomeFragment;
import com.example.datn_md_13.Fragment.NewsFragment;
import com.example.datn_md_13.Fragment.ProfileFragment;
import com.example.datn_md_13.Fragment.VoucherFragment;
import com.example.datn_md_13.Model.BannerDto;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.AuthManager;
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

    // HEADER refs
    private View headerRoot;
    private View headerGuest;
    private View headerUser;
    private TextView tvGreeting;
    private ShapeableImageView ivAvatar;
    private View btnGoLogin;

    private BannerAdapter bannerAdapter;
    private ApiService apiAuthed;

    // Banner item struct
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

        // Retrofit có interceptor tự chèn Authorization: Bearer <token>
        apiAuthed = ApiClient.authed(this).create(ApiService.class);

        // ====== Views ======
        rvBanner      = findViewById(R.id.rv_banner);
        mainContainer = findViewById(R.id.main_container);
        bottom        = findViewById(R.id.bottom_nav);

        // ====== Header ======
        headerRoot = findViewById(R.id.headerCard);
        if (headerRoot != null) {
            headerGuest = headerRoot.findViewById(R.id.header_guest);
            headerUser  = headerRoot.findViewById(R.id.header_user);
            tvGreeting  = headerRoot.findViewById(R.id.tvGreeting);
            ivAvatar    = headerRoot.findViewById(R.id.ivAvatar);
            btnGoLogin  = headerRoot.findViewById(R.id.btnGoLogin);

            // Click "Đăng nhập"
            if (btnGoLogin != null) {
                btnGoLogin.setOnClickListener(v ->
                        startActivity(new Intent(MainActivity.this,
                                com.example.datn_md_13.Activity.Login.class))
                );
            }

            // Click header user -> sang màn member
            if (headerUser != null) {
                headerUser.setOnClickListener(v -> {
                    if (AuthManager.isLoggedIn(MainActivity.this)) {
                        startActivity(new Intent(MainActivity.this,
                                com.example.datn_md_13.Activity.Activity_member.class));
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

        // ====== Bottom Nav ======
        bottom.setOnItemSelectedListener(item -> {
            int id = item.getItemId();

            if (id == R.id.nav_home) {
                setBannerVisible(true);
                setHeaderVisible(true);
                replaceFrag(new HomeFragment(), "home");
                return true;
            }

            if (id == R.id.nav_booking) {
                setBannerVisible(false);
                setHeaderVisible(false);
                replaceFrag(findOrCreate("cinema", new CinemaByAreaFragment()), "cinema");
                return true;
            }

            if (id == R.id.nav_voucher) {
                setBannerVisible(false);
                setHeaderVisible(false);
                replaceFrag(findOrCreate("voucher", new VoucherFragment()), "voucher");
                return true;
            }

            if (id == R.id.nav_news) {
                setBannerVisible(false);
                setHeaderVisible(false);
                replaceFrag(findOrCreate("news", new NewsFragment()), "news");
                return true;
            }

            if (id == R.id.nav_profile) {
                setBannerVisible(false);
                setHeaderVisible(false);
                replaceFrag(findOrCreate("profile", new ProfileFragment()), "profile");
                return true;
            }

            return false;
        });

        if (savedInstanceState == null) {
            bottom.setSelectedItemId(R.id.nav_home);
        }

        setHeaderVisible(true);
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadCurrentUserAndRenderHeader(); // luôn sync với server & cache
    }

    // ====== Fragment helpers ======
    private Fragment findOrCreate(String tag, Fragment fallback) {
        Fragment f = getSupportFragmentManager().findFragmentByTag(tag);
        return (f != null) ? f : fallback;
    }

    private void replaceFrag(Fragment f, String tag) {
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.main_container, f, tag)
                .commit();
    }

    // ====== Header sync với /users/me như User_Information ======
    private void loadCurrentUserAndRenderHeader() {
        if (headerRoot == null) return;

        if (!AuthManager.isLoggedIn(this)) {
            if (headerGuest != null) headerGuest.setVisibility(View.VISIBLE);
            if (headerUser  != null) headerUser.setVisibility(View.GONE);
            return;
        }

        apiAuthed.getUserProfile().enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call,
                                   @NonNull Response<User> response) {
                if (response.isSuccessful() && response.body() != null) {
                    User user = response.body();
                    // ✅ Lưu user mới nhất (full_name, avatar, ...) vào cache chung
                    AuthManager.saveUser(MainActivity.this, user);
                    renderHeader(user);
                } else {
                    // fallback: dùng cache nếu gọi API lỗi
                    User cached = AuthManager.getUser(MainActivity.this);
                    renderHeader(cached);
                }
            }

            @Override
            public void onFailure(@NonNull Call<User> call,
                                  @NonNull Throwable t) {
                User cached = AuthManager.getUser(MainActivity.this);
                renderHeader(cached);
            }
        });
    }

    // Render header theo User (có thể từ API hoặc cache)
    private void renderHeader(User u) {
        if (headerRoot == null) return;

        if (u == null) {
            if (headerGuest != null) headerGuest.setVisibility(View.VISIBLE);
            if (headerUser  != null) headerUser.setVisibility(View.GONE);
            return;
        }

        if (headerGuest != null) headerGuest.setVisibility(View.GONE);
        if (headerUser  != null) headerUser.setVisibility(View.VISIBLE);

        // ✅ Hiển thị "Chào <full_name>" đồng bộ với User_Information
        String name = getDisplayName(u);
        if (tvGreeting != null) {
            tvGreeting.setText("Chào " + name);
        }

        // Avatar
        if (ivAvatar != null) {
            String avatar = u.getAvatar();
            if (avatar != null && !avatar.trim().isEmpty()) {
                String avatarUrl = avatar.trim();
                if (!avatarUrl.startsWith("http")) {
                    avatarUrl = ApiClient.absolutePublicUrl(avatarUrl);
                }
                Glide.with(this)
                        .load(avatarUrl)
                        .placeholder(R.drawable.bg_avatar_placeholder)
                        .error(R.drawable.bg_avatar_placeholder)
                        .into(ivAvatar);
            } else {
                ivAvatar.setImageResource(R.drawable.bg_avatar_placeholder);
            }
        }
    }

    // ✅ Ưu tiên full_name để trùng với User_Information
    private String getDisplayName(User u) {
        if (u == null) return "Bạn";

        String name = null;

        // 1️⃣ full_name: tên hiển thị trong User_Information
        if (u.getFull_name() != null && !u.getFull_name().trim().isEmpty()) {
            name = u.getFull_name().trim();
        }
        // 2️⃣ username: fallback
        else if (u.getUsername() != null && !u.getUsername().trim().isEmpty()) {
            name = u.getUsername().trim();
        }
        // 3️⃣ prefix email: fallback cuối
        else if (u.getEmail() != null && !u.getEmail().trim().isEmpty()) {
            String email = u.getEmail().trim();
            int at = email.indexOf('@');
            name = (at > 0) ? email.substring(0, at) : email;
        }

        if (name == null || name.isEmpty()) return "Bạn";

        // Viết hoa chữ cái đầu mỗi từ
        String[] parts = name.toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) {
                sb.append(Character.toUpperCase(p.charAt(0)))
                        .append(p.length() > 1 ? p.substring(1) : "")
                        .append(" ");
            }
        }
        return sb.toString().trim();
    }

    // ====== Banner helpers ======
    private void setBannerVisible(boolean visible) {
        rvBanner.setVisibility(visible ? View.VISIBLE : View.GONE);
        ViewCompat.setOnApplyWindowInsetsListener(mainContainer, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            int top = visible ? 0 : bars.top;
            v.setPadding(v.getPaddingLeft(), top, v.getPaddingRight(), v.getPaddingBottom());
            return insets;
        });
        ViewCompat.requestApplyInsets(mainContainer);
    }

    private void setHeaderVisible(boolean visible) {
        if (headerRoot != null) headerRoot.setVisibility(visible ? View.VISIBLE : View.GONE);
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
                        it.imageUrl = img.image_url;
                        it.movieId  = img.movie_id;
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
            public void onFailure(@NonNull Call<List<BannerDto>> call,
                                  @NonNull Throwable t) {
                setBannerVisible(false);
                Toast.makeText(MainActivity.this,
                        "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
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
        @NonNull
        @Override
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
                    Intent i = new Intent(v.getContext(),
                            com.example.datn_md_13.activity_movie_detail.class);
                    i.putExtra("movie_id", it.movieId);
                    v.getContext().startActivity(i);
                } else {
                    Toast.makeText(v.getContext(),
                            "Banner này chưa gắn phim", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @Override
        public int getItemCount() {
            return bannerItems.size();
        }

        class VH extends RecyclerView.ViewHolder {
            android.widget.ImageView iv;
            VH(@NonNull android.view.View itemView) {
                super(itemView);
                iv = (android.widget.ImageView) itemView;
            }
        }
    }
}
