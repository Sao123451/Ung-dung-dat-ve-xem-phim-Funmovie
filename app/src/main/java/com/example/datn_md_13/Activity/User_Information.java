package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import de.hdodenhof.circleimageview.CircleImageView;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;


public class User_Information extends AppCompatActivity {

    private TextView tvFullName, tvEmail, tvPhoneNumber, tvBirthDate;
    private CircleImageView ivAvatar;
    private FloatingActionButton fabEdit;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_user_information);

        Toolbar toolbar = findViewById(R.id.toolbar);
        toolbar.setNavigationOnClickListener(v -> onBackPressed());

        ivAvatar     = findViewById(R.id.ivAvatar);
        tvFullName   = findViewById(R.id.tvFullName);
        tvEmail      = findViewById(R.id.tvEmail);
        tvPhoneNumber= findViewById(R.id.tvPhoneNumber);
        tvBirthDate  = findViewById(R.id.tvBirthDate);
        fabEdit      = findViewById(R.id.fabEdit);

        apiService = ApiClient.authed(this).create(ApiService.class);

        loadUserInfo();

        fabEdit.setOnClickListener(v -> {
            Intent intent = new Intent(User_Information.this, Edit_User_Info.class);
            startActivity(intent);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadUserInfo();
    }

    private void loadUserInfo() {
        Log.d("UserInfo", "Gọi API lấy thông tin hồ sơ...");

        apiService.getUserProfile().enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call, @NonNull Response<User> res) {

                Log.d("UserInfo", "HTTP code = " + res.code());

                if (!res.isSuccessful()) {
                    Toast.makeText(User_Information.this,
                            "Không thể tải thông tin người dùng (HTTP " + res.code() + ")",
                            Toast.LENGTH_SHORT).show();
                    return;
                }

                User user = res.body();
                if (user == null) {
                    Toast.makeText(User_Information.this,
                            "Dữ liệu người dùng trống!", Toast.LENGTH_SHORT).show();
                    return;
                }

                tvFullName.setText(nonEmpty(user.getFull_name(), "Chưa cập nhật"));
                tvEmail.setText(nonEmpty(user.getEmail(), "Chưa cập nhật"));
                tvPhoneNumber.setText(nonEmpty(user.getPhone(), "Chưa cập nhật"));
                tvBirthDate.setText(nonEmpty(user.getBirthDate(), "Chưa cập nhật"));

                loadAvatar(user.getAvatar());
            }

            @Override
            public void onFailure(@NonNull Call<User> call, @NonNull Throwable t) {
                Log.e("UserInfo", "Lỗi khi gọi API", t);
                Toast.makeText(User_Information.this,
                        "Không thể kết nối server!", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadAvatar(String avatarUrl) {
        if (avatarUrl != null && !avatarUrl.isEmpty()) {

            if (!avatarUrl.startsWith("http")) {
                avatarUrl = ApiClient.absolutePublicUrl(avatarUrl);
            }

            Glide.with(this)
                    .load(avatarUrl)
                    .placeholder(R.drawable.bg_avatar_circle)
                    .error(R.drawable.bg_avatar_circle)
                    .into(ivAvatar);
        } else {
            ivAvatar.setImageResource(R.drawable.bg_avatar_circle);
        }
    }

    private String nonEmpty(String s, String fallback) {
        return (s != null && !s.trim().isEmpty()) ? s : fallback;
    }
}
