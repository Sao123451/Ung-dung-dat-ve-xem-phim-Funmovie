package com.example.datn_md_13.Activity;

import android.content.Intent;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import retrofit2.Call;
import retrofit2.Response;

public class Activity_seat_selection extends AppCompatActivity {

    private static final String TAG = "SEAT_SCREEN";

    private ApiService api;
    private RecyclerView rvSeats;
    private CircularProgressIndicator progress;
    private TextView tvSelected, tvTotal;
    private SeatAdapter seatAdapter;

    private String showtimeId;
    private int basePrice = 0;

    // tránh gọi API 2 lần
    private Call<ShowtimeSeatResponse> inFlight;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_seat_selection);

        // Nếu layout không có @id/main, dùng decorView để set insets
        View root = findViewById(R.id.main);
        if (root == null) root = getWindow().getDecorView();
        View finalRoot = root;
        ViewCompat.setOnApplyWindowInsetsListener(finalRoot, (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
            return insets;
        });

        api = ApiClient.get().create(ApiService.class);
        showtimeId = getIntent().getStringExtra("showtime_id");
        basePrice  = getIntent().getIntExtra("ticket_price", 0);

        MaterialToolbar bar = findViewById(R.id.topAppBar);
        bar.setNavigationOnClickListener(v -> onBackPressed());

        progress   = findViewById(R.id.progress);
        tvSelected = findViewById(R.id.tvSelected);
        tvTotal    = findViewById(R.id.tvTotal);

        // RecyclerView
        rvSeats = findViewById(R.id.rvSeats);
        GridLayoutManager glm = new GridLayoutManager(this, 1);
        rvSeats.setLayoutManager(glm);

        seatAdapter = new SeatAdapter(this::updateSelectedUI);
        // gắn SpanSizeLookup TRƯỚC khi setAdapter để tránh layout pass đầu sai
        seatAdapter.attachSpanLookup(glm);
        rvSeats.setAdapter(seatAdapter);

        loadSeats();

        findViewById(R.id.btnContinue).setOnClickListener(v -> {
            List<SeatVM> selected = seatAdapter.getSelected();
            if (selected.isEmpty()) {
                Toast.makeText(this, "Chưa chọn ghế!", Toast.LENGTH_SHORT).show();
                return;
            }
            ArrayList<String> seatIds = new ArrayList<>();
            for (SeatVM s : selected) {
                seatIds.add(s._id);
                if (s._id2 != null) seatIds.add(s._id2); // ghế đôi
            }
            Intent i = new Intent(this, CheckoutActivity.class);
            i.putExtra("showtime_id", showtimeId);
            i.putExtra("ticket_price", basePrice);
            i.putStringArrayListExtra("seat_ids", seatIds);
            startActivity(i);
        });
    }

    // -------------------- FIXED: KHÔNG LỌC TRÙNG SAI --------------------

    private void loadSeats() {

        if (inFlight != null) inFlight.cancel();

        progress.setVisibility(View.VISIBLE);
        inFlight = api.getSeatsByShowtime(showtimeId);

        inFlight.enqueue(new retrofit2.Callback<ShowtimeSeatResponse>() {
            @Override
            public void onResponse(Call<ShowtimeSeatResponse> call, Response<ShowtimeSeatResponse> res) {
                progress.setVisibility(View.GONE);
                inFlight = null;

                if (!res.isSuccessful() || res.body() == null || res.body().seats == null) {
                    Toast.makeText(Activity_seat_selection.this, "Lỗi tải ghế!", Toast.LENGTH_SHORT).show();
                    return;
                }

                List<Seat> seats = res.body().seats;

                // -------------------
                // ❌ BỎ TOÀN BỘ FILTER TRÙNG
                // -------------------
                // ShowtimeSeat luôn trả 1 seat = 1 id nên KHÔNG ĐƯỢC lọc theo (row,number)
                // Chỉ cần dùng nguyên danh sách trả về
                List<Seat> cleaned = new ArrayList<>(seats);

                // -------------------
                // 🟢 GOM GHẾ THEO HÀNG
                // -------------------
                Map<String, List<Seat>> byRow = new LinkedHashMap<>();
                for (Seat s : cleaned) {
                    String r = s.row == null ? "" : s.row;
                    byRow.computeIfAbsent(r, k -> new ArrayList<>()).add(s);
                }

                List<SeatVM> flat = new ArrayList<>();
                Set<String> used = new LinkedHashSet<>();

                for (String row : byRow.keySet()) {
                    List<Seat> rowSeats = byRow.get(row);
                    rowSeats.sort((a,b)->Integer.compare(a.number,b.number));

                    for (int i = 0; i < rowSeats.size();) {
                        Seat s = rowSeats.get(i);
                        if (used.contains(s._id)) { i++; continue; }

                        boolean merged = false;

                        // -------------------
                        // 🟢 GHẾ ĐÔI
                        // -------------------
                        if ("couple".equalsIgnoreCase(s.seat_type) && i+1 < rowSeats.size()) {
                            Seat s2 = rowSeats.get(i+1);
                            if (s2 != null &&
                                    "couple".equalsIgnoreCase(s2.seat_type) &&
                                    safeEq(s2.row, s.row) &&
                                    s2.number == s.number + 1 &&
                                    !used.contains(s2._id)) {

                                SeatVM vm = new SeatVM();
                                vm._id = s._id;
                                vm._id2 = s2._id;
                                vm.row = row;
                                vm.number = s.number;
                                vm.type = "couple";
                                vm.span = 2;
                                vm.priceExtra = s.extra_price + s2.extra_price;

                                // Merge trạng thái
                                String st1 = s.resolvedStatus();
                                String st2 = s2.resolvedStatus();
                                if ("broken".equalsIgnoreCase(st1) || "broken".equalsIgnoreCase(st2))
                                    vm.status = "broken";
                                else if ("sold".equalsIgnoreCase(st1) || "sold".equalsIgnoreCase(st2))
                                    vm.status = "sold";
                                else if ("holding".equalsIgnoreCase(st1) || "holding".equalsIgnoreCase(st2))
                                    vm.status = "holding";
                                else vm.status = "available";

                                flat.add(vm);
                                used.add(s._id);
                                used.add(s2._id);

                                merged = true;
                                i += 2;
                            }
                        }

                        if (!merged) {
                            SeatVM vm = new SeatVM();
                            vm._id = s._id;
                            vm.row = row;
                            vm.number = s.number;
                            vm.type = s.seat_type;
                            vm.span = 1;
                            vm.priceExtra = s.extra_price;
                            vm.status = s.resolvedStatus();

                            flat.add(vm);
                            used.add(s._id);
                            i += 1;
                        }
                    }
                }

                // -------------------
                // 🟢 TÍNH SPAN
                // -------------------
                int span = calcColumnsFromFlat(flat);
                GridLayoutManager glm = (GridLayoutManager) rvSeats.getLayoutManager();
                if (glm != null) glm.setSpanCount(span);

                rvSeats.getRecycledViewPool().clear();
                while (rvSeats.getItemDecorationCount() > 0)
                    rvSeats.removeItemDecorationAt(0);

                rvSeats.addItemDecoration(new GridSpacingDecoration(span, dp(4), dp(4), true));
                rvSeats.setItemAnimator(null);

                seatAdapter.submit(flat);
                updateSelectedUI();
            }

            private int calcColumnsFromFlat(List<SeatVM> flat) {
                Map<String, Integer> rowWidth = new LinkedHashMap<>();
                for (SeatVM vm : flat) {
                    rowWidth.put(vm.row, rowWidth.getOrDefault(vm.row, 0) + vm.span);
                }
                int max = 1;
                for (int v : rowWidth.values()) max = Math.max(max, v);
                return max;
            }

            @Override
            public void onFailure(Call<ShowtimeSeatResponse> call, Throwable t) {
                if (call.isCanceled()) return;
                progress.setVisibility(View.GONE);
                inFlight = null;
                Toast.makeText(Activity_seat_selection.this, "Không kết nối server!", Toast.LENGTH_SHORT).show();
            }
        });
    }


    private boolean safeEq(String a, String b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.equals(b);
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

    @Override protected void onDestroy() {
        super.onDestroy();
        if (inFlight != null) inFlight.cancel();
    }
}
