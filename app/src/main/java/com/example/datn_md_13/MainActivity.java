package com.example.datn_md_13;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.fragment.app.Fragment;
import com.example.datn_md_13.Fragment.HomeFragment;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        // xử lý inset cho vùng nội dung
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main_container), (v,in)->{
            Insets bars = in.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, 0);
            return in;
        });

        BottomNavigationView bottom = findViewById(R.id.bottom_nav);
        ViewCompat.setOnApplyWindowInsetsListener(bottom, (v,in)->{
            Insets bars = in.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bars.bottom);
            return in;
        });

        bottom.setOnItemSelectedListener(item -> {
            Fragment f = new HomeFragment(); // hiện tại chỉ có Home
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.main_container, f)
                    .commit();
            return true;
        });

        if (savedInstanceState == null) {
            bottom.setSelectedItemId(R.id.nav_home); // nạp Home mặc định
        }
    }
}
