package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.MainActivity;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.example.datn_md_13.auth.AuthManager;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.progressindicator.LinearProgressIndicator;

import java.text.NumberFormat;
import java.util.Locale;

public class Activity_member extends AppCompatActivity {

    private TextView tvInitial, tvMemberName, tvLevel, tvTotalSpent, tvRewardPoints, tvVipHint, tvSpentLabel, tvVipTargetLabel;
    private LinearProgressIndicator progressVip;

    private static final int VIP_TARGET = 3_000_000; // 3 triệu

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_member);

        // --- Toolbar back ---
        MaterialToolbar topAppBar = findViewById(R.id.topAppBar);
        topAppBar.setNavigationOnClickListener(v -> finish()); // quay lại màn trước

        // --- Bind views ---
        tvInitial        = findViewById(R.id.tvInitial);
        tvMemberName     = findViewById(R.id.tvMemberName);
        tvLevel          = findViewById(R.id.tvLevel);
        tvTotalSpent     = findViewById(R.id.tvTotalSpent);
        tvRewardPoints   = findViewById(R.id.tvRewardPoints);
        tvVipHint        = findViewById(R.id.tvVipHint);
        tvSpentLabel     = findViewById(R.id.tvSpentLabel);
        tvVipTargetLabel = findViewById(R.id.tvVipTargetLabel);
        progressVip      = findViewById(R.id.progressVip);
        MaterialButton btnLogout = findViewById(R.id.btnLogout);

        // --- Hiển thị tên người dùng ---
        User u = AuthManager.getUser(this);
        String displayName = getDisplayName(u);
        tvMemberName.setText(displayName);
        tvInitial.setText(getInitial(displayName));
        tvLevel.setText("MEMBER"); // nếu có cấp bậc thực, set từ user

        // --- Demo dữ liệu chi tiêu/điểm (thay bằng dữ liệu thật nếu có) ---
        int totalSpent = 1_839_000;
        int rewardPts  = 0;
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi","VN"));
        tvTotalSpent.setText(nf.format(totalSpent) + " đ");
        tvRewardPoints.setText(nf.format(rewardPts));

        // Tiến độ lên VIP (dùng phần trăm 0..100 cho LinearProgressIndicator M3)
        int percent = Math.max(0, Math.min(100, (int)(totalSpent * 100f / VIP_TARGET)));
        progressVip.setProgressCompat(percent, true);
        tvVipHint.setText("Bạn cần tích lũy thêm " + nf.format(Math.max(VIP_TARGET - totalSpent, 0)) + " đ để thăng hạng VIP");
        tvSpentLabel.setText(nf.format(totalSpent) + " đ");
        tvVipTargetLabel.setText(nf.format(VIP_TARGET) + " đ");

        // --- Đăng xuất ---
        btnLogout.setOnClickListener(v -> {
            AuthManager.logout(this); // xóa cờ + user + token nếu có
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            finishAffinity(); // đóng hết activity hiện tại
        });
    }

    // Ưu tiên username -> full_name -> phần trước @ của email; và viết hoa đầu mỗi từ
    private String getDisplayName(User u) {
        if (u == null) return "Bạn";
        String name = null;
        if (u.getUsername() != null && !u.getUsername().trim().isEmpty()) {
            name = u.getUsername().trim();
        } else if (u.getFull_name() != null && !u.getFull_name().trim().isEmpty()) {
            name = u.getFull_name().trim();
        } else if (u.getEmail() != null && !u.getEmail().trim().isEmpty()) {
            String e = u.getEmail().trim();
            int at = e.indexOf('@');
            name = at > 0 ? e.substring(0, at) : e;
        }
        if (name == null || name.isEmpty()) return "Bạn";
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

    private String getInitial(String name) {
        if (name == null || name.isEmpty()) return "N";
        return String.valueOf(Character.toUpperCase(name.charAt(0)));
    }
}
