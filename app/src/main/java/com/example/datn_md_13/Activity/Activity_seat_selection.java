package com.example.datn_md_13.Activity;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.SeatAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Seat;
import com.example.datn_md_13.Model.SeatVM;
import com.example.datn_md_13.Model.ShowtimeSeatResponse;
import com.example.datn_md_13.R;
import com.example.datn_md_13.utils.GridSpacingDecoration;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.progressindicator.CircularProgressIndicator;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Response;

public class Activity_seat_selection extends AppCompatActivity {

    private static final String TAG = "SEAT_SCREEN";

    public boolean placeholder = false;


    private ApiService api;
    private RecyclerView rvSeats;
    private CircularProgressIndicator progress;
    private TextView tvSelected, tvTotal;
    private SeatAdapter seatAdapter;

    private String showtimeId;
    private int basePrice = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_seat_selection);

        View root = findViewById(R.id.main);
        if (root != null) {
            ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
                Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
                return insets;
            });
        }

        api = ApiClient.get().create(ApiService.class);
        showtimeId = getIntent().getStringExtra("showtime_id");
        basePrice  = getIntent().getIntExtra("ticket_price", 0);

        MaterialToolbar bar = findViewById(R.id.topAppBar);
        bar.setNavigationOnClickListener(v -> onBackPressed());

        rvSeats = findViewById(R.id.rvSeats);
        rvSeats.setLayoutManager(new GridLayoutManager(this, 1));

        progress   = findViewById(R.id.progress);
        tvSelected = findViewById(R.id.tvSelected);
        tvTotal    = findViewById(R.id.tvTotal);

        seatAdapter = new SeatAdapter(this::updateSelectedUI);
        rvSeats.setAdapter(seatAdapter);

        loadSeats();
    }

    private void loadSeats() {
        progress.setVisibility(View.VISIBLE);

        api.getSeatsByShowtime(showtimeId).enqueue(new retrofit2.Callback<ShowtimeSeatResponse>() {
            @Override
            public void onResponse(Call<ShowtimeSeatResponse> call, Response<ShowtimeSeatResponse> res) {
                progress.setVisibility(View.GONE);
                if (!res.isSuccessful() || res.body() == null || res.body().seats == null) {
                    Toast.makeText(Activity_seat_selection.this, "Lỗi tải ghế!", Toast.LENGTH_SHORT).show();
                    return;
                }

                List<Seat> seats = res.body().seats;

                // 1) Gom theo hàng & MERGE ghế đôi thành danh sách 'flat'
                Map<String, List<Seat>> byRowRaw = new LinkedHashMap<>();
                for (Seat s : seats) {
                    String key = s.row == null ? "" : s.row;
                    byRowRaw.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
                }

                List<SeatVM> flat = new ArrayList<>();
                for (Map.Entry<String, List<Seat>> e : byRowRaw.entrySet()) {
                    String row = e.getKey();
                    List<Seat> rowSeats = e.getValue();
                    rowSeats.sort((a,b) -> Integer.compare(a.number, b.number));

                    for (int i = 0; i < rowSeats.size();) {
                        Seat s = rowSeats.get(i);
                        boolean merged = false;

                        if ("couple".equalsIgnoreCase(s.seat_type) && i + 1 < rowSeats.size()) {
                            Seat s2 = rowSeats.get(i + 1);
                            if ("couple".equalsIgnoreCase(s2.seat_type)
                                    && s2.row.equals(s.row) && s2.number == s.number + 1) {
                                SeatVM vm = new SeatVM();
                                vm._id = s._id;
                                vm._id2 = s2._id;
                                vm.row = row;
                                vm.number = s.number;
                                vm.type = "couple";
                                vm.priceExtra = s.extra_price + s2.extra_price;
                                vm.span = 2;

                                String st1 = s.seat_status, st2 = s2.seat_status;
                                if ("broken".equalsIgnoreCase(st1) || "broken".equalsIgnoreCase(st2)) vm.status = "broken";
                                else if ("sold".equalsIgnoreCase(st1) || "sold".equalsIgnoreCase(st2)) vm.status = "sold";
                                else vm.status = "available";

                                flat.add(vm);
                                merged = true;
                                i += 2;
                            }
                        }

                        if (!merged) {
                            SeatVM vm = new SeatVM();
                            vm._id = s._id;
                            vm.row = row;
                            vm.number = s.number;
                            vm.type = s.seat_type;     // normal|vip
                            vm.priceExtra = s.extra_price;
                            vm.status = s.seat_status; // available|sold|broken
                            vm.span = 1;
                            flat.add(vm);
                            i += 1;
                        }
                    }
                }

                // 2) TÍNH SPAN TỪ 'flat' (đã merge)
                int span = calcColumnsFromFlat(flat);
                GridLayoutManager glm = (GridLayoutManager) rvSeats.getLayoutManager();
                if (glm != null) glm.setSpanCount(span);

                // 3) Spacing “không ăn mép” để không tràn
                while (rvSeats.getItemDecorationCount() > 0) rvSeats.removeItemDecorationAt(0);
                rvSeats.addItemDecoration(new GridSpacingDecoration(span, dp(4), dp(4),true));
                rvSeats.setHasFixedSize(true);
                rvSeats.setItemAnimator(null); // bỏ animation để tránh co giật

                // 4) Đẩy data & span lookup (ghế đôi chiếm 2 cột)
                seatAdapter.submit(flat);
                if (glm != null) seatAdapter.attachSpanLookup(glm);

                updateSelectedUI();
            }
            private int calcColumnsFromFlat(List<SeatVM> flat) {
                Map<String, Integer> perRow = new LinkedHashMap<>();
                for (SeatVM s : flat) {
                    String r = s.row == null ? "" : s.row;
                    perRow.put(r, perRow.getOrDefault(r, 0) + Math.max(1, s.span));
                }
                int max = 1;
                for (int v : perRow.values()) if (v > max) max = v;
                return max;
            }


            @Override
            public void onFailure(retrofit2.Call<ShowtimeSeatResponse> call, Throwable t) {
                progress.setVisibility(View.GONE);
                Toast.makeText(Activity_seat_selection.this, "Không kết nối server!", Toast.LENGTH_SHORT).show();
            }
        });
    }


    private int calcMaxSeatsPerRow(List<Seat> seats) {
        Map<String, Integer> cnt = new LinkedHashMap<>();
        for (Seat s : seats) {
            String r = s.row == null ? "" : s.row;
            cnt.put(r, cnt.getOrDefault(r, 0) + 1);
        }
        int max = 1;
        for (int v : cnt.values()) if (v > max) max = v;
        return max;
    }

    private int dp(int dp) { return Math.round(getResources().getDisplayMetrics().density * dp); }

    private void updateSelectedUI() {
        long total = 0;
        for (SeatVM s : seatAdapter.getSelected()) {
            total += (long) basePrice * s.qty() + (long) s.priceExtra;
        }
        tvSelected.setText("Ghế: " + seatAdapter.getSelectedLabels());
        tvTotal.setText(total + " đ");
    }
}
