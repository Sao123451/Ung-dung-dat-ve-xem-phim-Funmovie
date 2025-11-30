package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AlertDialog;
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

    private CountDownTimer seatTimer;
    private long timeLeftMs = 1 * 60 * 1000; // 10 phút mặc định


    // tránh gọi API 2 lần
    private Call<ShowtimeSeatResponse> inFlight;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_seat_selection);

        startSeatCountdown();

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

        MaterialToolbar bar = findViewById(R.id.topBar);
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
            List<SeatVM> allSeats = seatAdapter.getAll();

            if (selected.isEmpty()) {
                showErrorDialog("Chưa chọn ghế",
                        "Bạn cần chọn ít nhất 1 ghế để tiếp tục!",
                        null);
                return;
            }

            String error = validateSeatRules(selected, allSeats);
            if (error != null) {
                showErrorDialog("Ghế không hợp lệ", error, null);
                return;
            }


            ArrayList<String> seatIds = new ArrayList<>();
            for (SeatVM s : selected) {
                seatIds.add(s._id);
                if (s._id2 != null) seatIds.add(s._id2);
            }


            ArrayList<String> seatLabels = new ArrayList<>();
            for (SeatVM s : selected) {
                seatLabels.add(s.label());
            }

            Intent i = new Intent(this, CheckoutActivity.class);
            i.putExtra("showtime_id", showtimeId);
            i.putExtra("ticket_price", basePrice);
            i.putStringArrayListExtra("seat_ids", seatIds);
            i.putStringArrayListExtra("seat_labels", seatLabels);

            startActivity(i);
        });

    }
    @Override
    protected void onStop() {
        super.onStop();
        if (seatTimer != null) {
            seatTimer.cancel();
            seatTimer = null;
        }
    }
    @Override
    protected void onStart() {
        super.onStart();

        // Nếu còn thời gian → chạy tiếp
        if (timeLeftMs > 0 && seatTimer == null) {
            startSeatCountdown();
        }
    }



    private void startSeatCountdown() {
        seatTimer = new CountDownTimer(timeLeftMs, 1000) {
            @Override
            public void onTick(long ms) {
                timeLeftMs = ms; // ⭐ LƯU THỜI GIAN CÒN LẠI

                long sec = ms / 1000;
                long m = sec / 60;
                long s = sec % 60;

                TextView tv = findViewById(R.id.tvCountdown);
                tv.setText(String.format("%02d:%02d", m, s));
            }


            @Override
            public void onFinish() {
                timeLeftMs = 0; // hết giờ

                // Inflate layout dialog custom
                View view = getLayoutInflater().inflate(R.layout.custom_dialog_error, null);

                TextView tvTitle = view.findViewById(R.id.tvTitle);
                TextView tvMessage = view.findViewById(R.id.tvMessage);
                Button btnOk = view.findViewById(R.id.btnOk);

                tvTitle.setText("Hết thời gian chọn ghế");
                tvMessage.setText("Bạn đã hết 10 phút chọn ghế. Vui lòng chọn lại!");

                AlertDialog dialog = new AlertDialog.Builder(Activity_seat_selection.this)
                        .setView(view)
                        .setCancelable(false)
                        .create();

                if (dialog.getWindow() != null) {
                    dialog.getWindow().setBackgroundDrawable(
                            new ColorDrawable(Color.TRANSPARENT)
                    );
                }

                btnOk.setOnClickListener(v -> {
                    dialog.dismiss();
                    finish();   // đóng màn hình
                });

                dialog.show();
            }

        }.start();
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


                // ShowtimeSeat luôn trả 1 seat = 1 id nên KHÔNG ĐƯỢC lọc theo (row,number)
                // Chỉ cần dùng nguyên danh sách trả về
                List<Seat> cleaned = new ArrayList<>(seats);

                // -------------------
                // GOM GHẾ THEO HÀNG
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
                        // GHẾ ĐÔI
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


    //  updateSelectedUI — CHỈ cập nhật UI, KHÔNG validate tại đây
    private void updateSelectedUI() {
        List<SeatVM> selected = seatAdapter.getSelected();

        long total = 0;
        for (SeatVM s : selected) {
            total += (long) basePrice * s.qty() + s.priceExtra;
        }

        tvSelected.setText("Ghế: " + seatAdapter.getSelectedLabels());
        tvTotal.setText(total + " đ");
    }


    //  PHẦN THÊM — validate rule chống để trống ghế
    private String validateSeatRules(List<SeatVM> selected, List<SeatVM> all) {

        // Gom ghế theo hàng
        Map<String, List<SeatVM>> rows = new LinkedHashMap<>();
        for (SeatVM s : all) {
            rows.computeIfAbsent(s.row, k -> new ArrayList<>()).add(s);
        }

        for (String row : rows.keySet()) {

            List<SeatVM> rowSeats = rows.get(row);
            rowSeats.sort((a, b) -> Integer.compare(a.number, b.number));

            // Tập ghế chọn (bao gồm ghế đôi)
            Set<Integer> chosen = new LinkedHashSet<>();
            for (SeatVM s : selected) {
                if (s.row.equals(row)) {
                    chosen.add(s.number);
                    if ("couple".equals(s.type)) chosen.add(s.number + 1);
                }
            }

            if (chosen.isEmpty()) continue;

            // ============ RULE 1: CẤM GHẾ MỒ CÔI NGOÀI ===============

            SeatVM first = rowSeats.get(0);
            SeatVM second = rowSeats.get(1);

            if (chosen.contains(second.number)) {
                if (first.isAvailable() && !chosen.contains(first.number)) {
                    return "Không được để trống " + first.label() + " khi chọn " + second.label();
                }
            }

            SeatVM last = rowSeats.get(rowSeats.size() - 1);
            SeatVM beforeLast = rowSeats.get(rowSeats.size() - 2);

            if (chosen.contains(beforeLast.number)) {
                if (last.isAvailable() && !chosen.contains(last.number)) {
                    return "Không được để trống " + last.label() + " khi chọn " + beforeLast.label();
                }
            }

            // ============ RULE 2: GHẾ MỒ CÔI Ở GIỮA ===============
            // Ví dụ: A1 chọn, A2 trống, A3 chọn → A2 bị kẹt → CẤM

            for (int i = 1; i < rowSeats.size() - 1; i++) {
                SeatVM mid = rowSeats.get(i);
                SeatVM left = rowSeats.get(i - 1);
                SeatVM right = rowSeats.get(i + 1);

                // GHẾ MID phải là available & không chọn
                boolean midTrống = mid.isAvailable() && !chosen.contains(mid.number);

                // Left & Right đều được chọn → => mid bị kẹt
                boolean bịKẹt = chosen.contains(left.number) && chosen.contains(right.number);

                if (midTrống && bịKẹt) {
                    return "Không được để trống " + mid.label() +
                            " giữa " + left.label() + " và " + right.label();
                }
            }
        }

        return null;
    }


    // PHẦN THÊM — popup thông báo lỗi
    private void showErrorDialog(String title, String msg, Runnable onOk) {
        View view = getLayoutInflater().inflate(R.layout.custom_dialog_error, null);

        TextView tvTitle = view.findViewById(R.id.tvTitle);
        TextView tvMessage = view.findViewById(R.id.tvMessage);
        Button btnOk = view.findViewById(R.id.btnOk);

        tvTitle.setText(title);
        tvMessage.setText(msg);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(view)
                .create();

        if (dialog.getWindow() != null)
            dialog.getWindow().setBackgroundDrawable(
                    new ColorDrawable(Color.TRANSPARENT)
            );

        btnOk.setOnClickListener(v -> {
            dialog.dismiss();
            if (onOk != null) onOk.run();
        });

        dialog.show();
    }


    @Override protected void onDestroy() {
        super.onDestroy();
        if (inFlight != null) inFlight.cancel();
    }



}
