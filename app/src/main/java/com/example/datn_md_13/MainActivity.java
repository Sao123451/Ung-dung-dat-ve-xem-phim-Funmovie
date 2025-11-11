package com.example.datn_md_13;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.IntentSender;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
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
import com.example.datn_md_13.Fragment.CinemaByAreaFragment;
import com.example.datn_md_13.Fragment.VoucherFragment;
import com.example.datn_md_13.Fragment.NewsFragment;
import com.example.datn_md_13.Fragment.ProfileFragment;
import com.example.datn_md_13.Model.BannerDto;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.AuthManager;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;
import com.google.android.gms.location.SettingsClient;
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
    private View headerRoot;
    private View headerGuest;
    private View headerUser;
    private TextView tvGreeting;
    private ShapeableImageView ivAvatar;
    private View btnGoLogin;

    private BannerAdapter bannerAdapter;

    // Item hiển thị banner
    private static class Item {
        String imageUrl;
        String movieId;
    }
    private final List<Item> bannerItems = new ArrayList<>();
    private final Handler autoScrollHandler = new Handler(Looper.getMainLooper());
    private int bannerIndex = 0;

    // ====== LOCATION (GPS) ======
    private static final int REQ_LOCATION   = 1001;
    private static final int REQ_RESOLUTION = 2001;

    private FusedLocationProviderClient fusedLocationClient;
    // Lưu vị trí user để chỗ khác dùng (adapter, fragment...)
    public static Double USER_LAT = null;
    public static Double USER_LNG = null;
    // ============================

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        // ====== Views ======
        rvBanner      = findViewById(R.id.rv_banner);
        mainContainer = findViewById(R.id.main_container);
        bottom        = findViewById(R.id.bottom_nav);

        // Header trong activity_main.xml
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

        // ====== Bottom nav → dùng Fragment cho tất cả tab ======
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

        if (savedInstanceState == null) bottom.setSelectedItemId(R.id.nav_home);
        setHeaderVisible(true);

        // ====== LOCATION init ======
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        checkLocationPermissionAndGet();
        // ===========================
    }

    // helper: reuse fragment theo tag (tránh tạo lại)
    private Fragment findOrCreate(String tag, Fragment fallback) {
        Fragment f = getSupportFragmentManager().findFragmentByTag(tag);
        return (f != null) ? f : fallback;
    }
    private void replaceFrag(Fragment f, String tag) {
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.main_container, f, tag)
                .commit();
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderHeader();
    }

    // ====== HEADER logic ======
    private void renderHeader() {
        if (headerRoot == null) return;

        if (!AuthManager.isLoggedIn(this)) {
            if (headerGuest != null) headerGuest.setVisibility(View.VISIBLE);
            if (headerUser != null) headerUser.setVisibility(View.GONE);
            return;
        }

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

    // Ưu tiên username -> full_name -> phần trước @ của email
    private String getDisplayName(User u) {
        if (u == null) return "Bạn";
        String name = null;
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

    // ====== LOCATION helpers ======
    private void checkLocationPermissionAndGet() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{ Manifest.permission.ACCESS_FINE_LOCATION },
                    REQ_LOCATION
            );
        } else {
            requestHighAccuracyAndGetLocation();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                requestHighAccuracyAndGetLocation();
            } else {
                // user từ chối, tuỳ bạn xử lý (có thể show toast)
            }
        }
    }

    private void requestHighAccuracyAndGetLocation() {
        LocationRequest locationRequest = LocationRequest.create()
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY);

        LocationSettingsRequest.Builder builder =
                new LocationSettingsRequest.Builder().addLocationRequest(locationRequest);

        SettingsClient client = LocationServices.getSettingsClient(this);
        client.checkLocationSettings(builder.build())
                .addOnSuccessListener(response -> getCurrentLocation())
                .addOnFailureListener(e -> {
                    if (e instanceof ResolvableApiException) {
                        try {
                            ((ResolvableApiException) e)
                                    .startResolutionForResult(MainActivity.this, REQ_RESOLUTION);
                        } catch (IntentSender.SendIntentException ex) { }
                    }
                });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_RESOLUTION && resultCode == RESULT_OK) {
            // User đã bật location → lấy lại vị trí
            getCurrentLocation();
        }
    }


    @SuppressLint("MissingPermission")
    private void getCurrentLocation() {
        com.google.android.gms.location.LocationRequest req =
                com.google.android.gms.location.LocationRequest.create()
                        .setPriority(com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY)
                        .setInterval(1000)      // 1s
                        .setNumUpdates(1);      // lấy 1 lần rồi dừng

        fusedLocationClient.requestLocationUpdates(
                req,
                new com.google.android.gms.location.LocationCallback() {
                    @Override
                    public void onLocationResult(
                            @NonNull com.google.android.gms.location.LocationResult locationResult) {
                        android.location.Location loc = locationResult.getLastLocation();
                        if (loc != null) {
                            MainActivity.USER_LAT = loc.getLatitude();
                            MainActivity.USER_LNG = loc.getLongitude();
                            android.util.Log.d(
                                    "GPS",
                                    "userLat=" + USER_LAT + ", userLng=" + USER_LNG
                            );
                        } else {
                            android.util.Log.d("GPS", "Location is null");
                        }

                        fusedLocationClient.removeLocationUpdates(this);
                    }
                },
                android.os.Looper.getMainLooper()
        );
    }


    // =============================

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
            Glide.with(holder.iv.getContext()).load(it.imageUrl).centerCrop().into(holder.iv);
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
