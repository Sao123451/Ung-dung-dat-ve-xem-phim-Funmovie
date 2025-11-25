package com.example.datn_md_13.Activity;

import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.AuthManager;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MemberCardActivity extends AppCompatActivity {

    TextView tvMemberLevel, tvCardNumber, tvCreateDate, tvActive;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_member_card);

        // ===== Find Views =====
        tvMemberLevel = findViewById(R.id.tvMemberLevel);
        tvCardNumber  = findViewById(R.id.tvCardNumber);
        tvCreateDate  = findViewById(R.id.tvCreateDate);
        tvActive      = findViewById(R.id.tvActive);

        // ===== Toolbar Back =====
        findViewById(R.id.toolbar).setOnClickListener(v -> onBackPressed());

        // ===== Load User Data =====
        loadMemberData();
    }

    private void loadMemberData() {

        // Retrofit có token (authed)
        ApiService api = ApiClient.authed(this).create(ApiService.class);

        api.getUserProfile().enqueue(new Callback<User>() {
            @Override
            public void onResponse(Call<User> call, Response<User> response) {

                if (!response.isSuccessful() || response.body() == null) {
                    Toast.makeText(MemberCardActivity.this,
                            "Không lấy được dữ liệu", Toast.LENGTH_SHORT).show();
                    return;
                }

                User u = response.body();

                // ---------- LEVEL ----------
                String role = (u.getRole() == null) ? "customer" : u.getRole().toLowerCase();
                String level;

                switch (role) {
                    case "admin":   level = "ADMIN"; break;
                    case "manager": level = "MANAGER"; break;
                    case "staff":   level = "STAFF"; break;
                    default:        level = "STANDARD"; break;
                }

                tvMemberLevel.setText("Khách hàng " + level);

                // ---------- CARD NUMBER ----------
                String card = (u.getMembership_card() == null || u.getMembership_card().isEmpty())
                        ? "Chưa có thẻ"
                        : u.getMembership_card();

                tvCardNumber.setText("Số thẻ: " + card);

                // ---------- CREATE DATE ----------
                Date created = u.getCreated_at();
                tvCreateDate.setText("Ngày đăng ký: " + safeDate(created));

                // ---------- BADGE ----------
                tvActive.setText("Đang sử dụng");
            }

            @Override
            public void onFailure(Call<User> call, Throwable t) {
                Toast.makeText(MemberCardActivity.this,
                        "Lỗi kết nối", Toast.LENGTH_SHORT).show();
            }
        });
    }

    /** Format Date thành dd/MM/yyyy */
    private String safeDate(Date date) {
        if (date == null) return "--/--/----";

        try {
            SimpleDateFormat outF =
                    new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
            return outF.format(date);

        } catch (Exception e) {
            return "--/--/----";
        }
    }
}
