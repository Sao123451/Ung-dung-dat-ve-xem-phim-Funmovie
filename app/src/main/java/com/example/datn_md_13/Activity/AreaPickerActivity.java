package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.AreaRowAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.PublicCinemaResponse;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import com.example.datn_md_13.Model.Cinema;
import com.example.datn_md_13.Model.PublicCinemaResponse;



public class AreaPickerActivity extends AppCompatActivity {

    public static final String EXTRA_CITY = "extra_city";

    @Override protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_area_picker);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        RecyclerView rv = findViewById(R.id.rvAreas);
        rv.setLayoutManager(new LinearLayoutManager(this));

        AreaRowAdapter adapter = new AreaRowAdapter(city -> {
            Intent i = new Intent();
            i.putExtra(EXTRA_CITY, city);
            setResult(RESULT_OK, i);
            finish();
        });
        rv.setAdapter(adapter);

        // Gọi API lấy danh sách rạp rồi group theo city -> đếm số rạp
        ApiService api = ApiClient.get().create(ApiService.class);
        api.getCinemasPublic(null, 200, null, null).enqueue(new Callback<PublicCinemaResponse>() {
            @Override public void onResponse(Call<PublicCinemaResponse> call, Response<PublicCinemaResponse> res) {
                if (!res.isSuccessful() || res.body()==null || res.body().items==null) {
                    Toast.makeText(AreaPickerActivity.this, "Không tải được danh sách khu vực", Toast.LENGTH_SHORT).show();
                    return;
                }
                Map<String, Integer> counts = new LinkedHashMap<>();

                List<Cinema> items = res.body().items;
                for (Cinema c : items) {
                    String city = (c.getCity() == null || c.getCity().isEmpty()) ? "Khác" : c.getCity();
                    counts.put(city, counts.getOrDefault(city, 0) + 1);
                }

                // build list
                List<AreaRow> rows = new ArrayList<>();
                int total = 0; for (int v : counts.values()) total += v;
                rows.add(new AreaRow("Tất cả", total));
                for (Map.Entry<String,Integer> e: counts.entrySet()) {
                    rows.add(new AreaRow(e.getKey(), e.getValue()));
                }
                adapter.submit(rows);
            }
            @Override public void onFailure(Call<PublicCinemaResponse> call, Throwable t) {
                Toast.makeText(AreaPickerActivity.this, "Lỗi mạng", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // --- row model (PHẢI public để adapter truy cập)
    public static class AreaRow {
        public String name;
        public int count;
        public AreaRow(String n,int c){ name=n; count=c; }
    }
}
