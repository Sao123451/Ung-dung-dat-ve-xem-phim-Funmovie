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

    private void loadSeats() {
        // hủy call cũ nếu có
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
                int rawCount = seats.size();

                // ===== 0) Lọc trùng theo _id và theo (row,number) =====
                // (Nếu API trả nhầm/duplicate -> app vẫn hiển thị đúng số ghế thực)
                Map<String, Seat> uniqueById = new LinkedHashMap<>();
                Set<String> keyRowNum = new LinkedHashSet<>();
                List<Seat> cleaned = new ArrayList<>();
                for (Seat s : seats) {
                    if (s == null) continue;
                    if (s._id == null || s._id.isEmpty()) continue;
                    String rn = String.format(Locale.US, "%s#%d", (s.row == null ? "" : s.row), s.number);
                    if (uniqueById.containsKey(s._id)) continue;           // trùng _id
                    if (keyRowNum.contains(rn)) continue;                   // trùng (row,number)
                    uniqueById.put(s._id, s);
                    keyRowNum.add(rn);
                    cleaned.add(s);
                }

                // ===== 1) Gom hàng & merge ghế đôi -> danh sách 'flat' =====
                Map<String, List<Seat>> byRowRaw = new LinkedHashMap<>();
                for (Seat s : cleaned) {
                    String key = s.row == null ? "" : s.row;
                    byRowRaw.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
                }

                List<SeatVM> flat = new ArrayList<>();
                Set<String> usedIds = new LinkedHashSet<>(); // đánh dấu id đã dùng (để không push lặp)
                for (Map.Entry<String, List<Seat>> e : byRowRaw.entrySet()) {
                    String row = e.getKey();
                    List<Seat> rowSeats = e.getValue();
                    rowSeats.sort((a,b) -> Integer.compare(a.number, b.number));

                    for (int i = 0; i < rowSeats.size();) {
                        Seat s = rowSeats.get(i);
                        if (s == null || usedIds.contains(s._id)) { i++; continue; }
                        boolean merged = false;

                        // GHẾ ĐÔI
                        if ("couple".equalsIgnoreCase(s.seat_type) && i + 1 < rowSeats.size()) {
                            Seat s2 = rowSeats.get(i + 1);
                            if (s2 != null
                                    && !usedIds.contains(s2._id)
                                    && "couple".equalsIgnoreCase(s2.seat_type)
                                    && safeEq(s2.row, s.row)
                                    && s2.number == s.number + 1) {

                                SeatVM vm = new SeatVM();
                                vm._id = s._id;
                                vm._id2 = s2._id;
                                vm.row = row;
                                vm.number = s.number;
                                vm.type = "couple";
                                vm.priceExtra = s.extra_price + s2.extra_price;
                                vm.span = 2;

                                // [CHANGE] gộp status: ưu tiên broken > sold > holding > available
                                String st1 = s.resolvedStatus();
                                String st2 = s2.resolvedStatus();
                                if ("broken".equalsIgnoreCase(st1) || "broken".equalsIgnoreCase(st2)) {
                                    vm.status = "broken";
                                } else if ("sold".equalsIgnoreCase(st1) || "sold".equalsIgnoreCase(st2)) {
                                    vm.status = "sold";
                                } else if ("holding".equalsIgnoreCase(st1) || "holding".equalsIgnoreCase(st2)) {
                                    vm.status = "holding";
                                } else {
                                    vm.status = "available";
                                }

                                flat.add(vm);
                                usedIds.add(s._id);
                                usedIds.add(s2._id);
                                merged = true;
                                i += 2;
                            }
                        }

// GHẾ ĐƠN (giữ nguyên, chỉ cần chắc chắn dùng resolvedStatus)
                        if (!merged) {
                            SeatVM vm = new SeatVM();
                            vm._id = s._id;
                            vm.row = row;
                            vm.number = s.number;
                            vm.type = s.seat_type;
                            vm.priceExtra = s.extra_price;
                            vm.status = s.resolvedStatus();   // luôn dùng helper, có thể là holding
                            vm.span = 1;
                            flat.add(vm);
                            usedIds.add(s._id);
                            i += 1;
                        }
                    }
                }

                // ===== 2) Tính span theo hàng sau khi merge =====
                int span = calcColumnsFromFlat(flat);
                GridLayoutManager glm = (GridLayoutManager) rvSeats.getLayoutManager();
                if (glm != null) glm.setSpanCount(span);

                // ===== 3) Làm sạch pool/spacing rồi mới đẩy dữ liệu =====
                rvSeats.getRecycledViewPool().clear();
                while (rvSeats.getItemDecorationCount() > 0) rvSeats.removeItemDecorationAt(0);
                rvSeats.addItemDecoration(new GridSpacingDecoration(span, dp(4), dp(4), true));
                rvSeats.setHasFixedSize(true);
                rvSeats.setItemAnimator(null);

                // ===== 4) Nạp data =====
                Log.d(TAG, "raw=" + rawCount + ", cleaned=" + cleaned.size()
                        + ", flat=" + flat.size() + ", span=" + span);
                seatAdapter.submit(flat);
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
