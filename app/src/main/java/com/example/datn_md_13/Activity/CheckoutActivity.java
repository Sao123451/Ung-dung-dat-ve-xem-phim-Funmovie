package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.ProductQtyAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.BaseResponse;
import com.example.datn_md_13.Model.BookingCreateResponse;
import com.example.datn_md_13.Model.BookingQuoteResponse;
import com.example.datn_md_13.Model.BookingRequest;
import com.example.datn_md_13.Model.PaymentInitReq;
import com.example.datn_md_13.Model.ProductDto;
import com.example.datn_md_13.Model.ProductListRes;
import com.example.datn_md_13.Model.ReleaseSeatRequest;
import com.example.datn_md_13.Model.UserVoucherItem;
import com.example.datn_md_13.Model.VnPayInitResponse;
import com.example.datn_md_13.Model.VoucherListRes;
import com.example.datn_md_13.R;
import com.example.datn_md_13.AuthManager;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.gson.Gson;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CheckoutActivity extends AppCompatActivity {

    private ApiService api;

    private RadioGroup rgMethod;
    private ProgressBar progress;
    private TextView tvInfo, tvVouchers, tvSeatSubtotal, tvComboSubtotal, tvDiscount, tvTotal, tvTotalBottom;
    private RecyclerView rvProducts;
    private Button btnPay, btnPickVoucher;

    private String showtimeId;
    private ArrayList<String> seatIds;

    private String paymentMethod = "vnpay"; // mặc định VNPay
    private ProductQtyAdapter productAdapter;
    private final ArrayList<String> selectedVouchers = new ArrayList<>();
    private final NumberFormat nf = NumberFormat.getNumberInstance(new Locale("vi","VN"));

    private CountDownTimer payTimer;

    private TextView tvCountdownPay;
    private ArrayList<String> seatLabels;



    private final Gson gson = new Gson();

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);

        api = ApiClient.authed(this).create(ApiService.class);

        /* ============================================================
            NHẬN DỮ LIỆU TỪ Intent
         ============================================================ */
        showtimeId = getIntent().getStringExtra("showtime_id");
        seatIds = getIntent().getStringArrayListExtra("seat_ids");

        seatLabels = getIntent().getStringArrayListExtra("seat_labels");

        if (seatLabels == null) seatLabels = new ArrayList<>();


        if (seatIds == null) seatIds = new ArrayList<>();

        Log.e("CHECKOUT", "===== CHECKOUT START =====");
        Log.e("CHECKOUT", "Showtime: " + showtimeId);
        Log.e("CHECKOUT", "SeatIds: " + gson.toJson(seatIds));

        bindViews();
        startPayCountdown();

        rvProducts.setLayoutManager(new LinearLayoutManager(this));
        productAdapter = new ProductQtyAdapter(() -> loadQuote(selectedVouchers));
        rvProducts.setAdapter(productAdapter);
        rvProducts.setAdapter(productAdapter);

        tryLoadProducts();

        btnPickVoucher.setOnClickListener(v -> openVoucherPicker());

        /* ============================================================
           SELECT PAYMENT METHOD
         ============================================================ */
//        rgMethod.setOnCheckedChangeListener((group, checkedId) -> {
//            if (checkedId == R.id.rbMomo) paymentMethod = "momo";
//            else if (checkedId == R.id.rbZalo) paymentMethod = "zalopay";
//            else if (checkedId == R.id.rbVnpay) paymentMethod = "vnpay";
//
//            Log.e("CHECKOUT", "PaymentMethod = " + paymentMethod);
//        });

        /* ============================================================
            NÚT THANH TOÁN
        ============================================================ */
        btnPay.setOnClickListener(v -> {
            Log.e("CHECKOUT", "PAY CLICKED → method=" + paymentMethod);

            if (paymentMethod.equals("vnpay")) {
                payWithVnpay();
            } else {
                Toast.makeText(this, "Phương thức chưa hỗ trợ", Toast.LENGTH_SHORT).show();
            }
        });

        loadQuote(selectedVouchers);


        MaterialToolbar toolbar = findViewById(R.id.topBar);
        toolbar.setNavigationOnClickListener(v -> onBackPressed());

    }

    private void bindViews() {
        progress = findViewById(R.id.progress);
        tvInfo = findViewById(R.id.tvInfo);
        tvVouchers = findViewById(R.id.tvVouchers);
        tvSeatSubtotal = findViewById(R.id.tvSeatSubtotal);
        tvComboSubtotal = findViewById(R.id.tvComboSubtotal);
        tvDiscount = findViewById(R.id.tvDiscount);
        tvTotal = findViewById(R.id.tvTotal);
        tvTotalBottom = findViewById(R.id.tvTotalBottom);
        btnPay = findViewById(R.id.btnPay);
        btnPickVoucher = findViewById(R.id.btnPickVoucher);
        rvProducts = findViewById(R.id.rvProducts);
//        rgMethod = findViewById(R.id.rgMethod);
        tvCountdownPay = findViewById(R.id.tvCountdownPay);


        if (!seatLabels.isEmpty()) {
            tvInfo.setText("Ghế đã chọn: " + String.join(", ", seatLabels));
        } else {
            tvInfo.setText("Ghế đã chọn: " + seatIds.size() + " ghế");
        }

    }
    /* ===== Load sản phẩm ===== */
    private void tryLoadProducts() {
        api.getProducts().enqueue(new Callback<ProductListRes>() {
            @Override public void onResponse(Call<ProductListRes> call, Response<ProductListRes> res) {
                List<ProductQtyAdapter.Row> rows = new ArrayList<>();
                if (res.isSuccessful() && res.body()!=null && res.body().items!=null && !res.body().items.isEmpty()) {
                    for (ProductDto p : res.body().items) {
                        ProductQtyAdapter.Row r = new ProductQtyAdapter.Row();
                        r.id    = (p.id != null && !p.id.isEmpty())
                                ? p.id
                                : (p.name != null ? p.name : java.util.UUID.randomUUID().toString());
                        r.name  = p.name != null ? p.name : "Sản phẩm";
                        r.type  = p.type != null ? p.type : "combo";
                        r.price = (p.price != null) ? p.price : 0;
                        r.qty   = 0;
                        r.image = ApiClient.absolutePublicUrl(p.image);
                        rows.add(r);
                    }
                    productAdapter.setItems(rows);
                } else {
                    fallbackMock();
                }
            }
            @Override public void onFailure(Call<ProductListRes> call, Throwable t) { fallbackMock(); }

            private void fallbackMock() {
                List<ProductQtyAdapter.Row> rows = new ArrayList<>();
                rows.add(mockRow("Combo 1 Bắp + 1 Nước", "combo", 65000));
                rows.add(mockRow("Bắp 69oz", "popcorn", 45000));
                rows.add(mockRow("Coca 500ml", "drink", 30000));
                productAdapter.setItems(rows);
            }
        });
    }

    private ProductQtyAdapter.Row mockRow(String name, String type, int price) {
        ProductQtyAdapter.Row r = new ProductQtyAdapter.Row();
        r.id = name.replaceAll("\\s+","-").toLowerCase(Locale.ROOT);
        r.name = name; r.type = type; r.price = price; r.qty = 0;
        return r;
    }
    private void startPayCountdown() {
        payTimer = new CountDownTimer(10 * 60 * 1000, 1000) {
            @Override
            public void onTick(long ms) {
                long sec = ms / 1000;
                long m = sec / 60;
                long s = sec % 60;

                tvCountdownPay.setText(String.format("%02d:%02d", m, s));
            }

            @Override
            public void onFinish() {
                handlePayTimeout();
            }
        };
        payTimer.start();
    }
    private void handlePayTimeout() {

        // ⭐ Trả ghế ngay
        releaseHoldingSeats(seatIds);

        // ⭐ Dùng dialog custom
        View view = getLayoutInflater().inflate(R.layout.custom_dialog_error, null);

        TextView tvTitle = view.findViewById(R.id.tvTitle);
        TextView tvMessage = view.findViewById(R.id.tvMessage);
        Button btnOk = view.findViewById(R.id.btnOk);

        tvTitle.setText("Hết thời gian thanh toán");
        tvMessage.setText("Bạn đã hết 10 phút thanh toán. Vui lòng đặt lại vé.");

        AlertDialog dialog = new AlertDialog.Builder(this)
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
            finish(); // đóng màn checkout
        });

        dialog.show();
    }

    @Override
    protected void onDestroy() {
        if (payTimer != null) payTimer.cancel();
        super.onDestroy();
    }




    private void openVoucherPicker() {

        api.getMyVouchers().enqueue(new Callback<VoucherListRes>() {

            @Override
            public void onResponse(Call<VoucherListRes> call,
                                   Response<VoucherListRes> res) {

                List<UserVoucherItem> items =
                        (res.isSuccessful() && res.body() != null)
                                ? res.body().items
                                : null;

                if (items == null || items.isEmpty()) {
                    Toast.makeText(CheckoutActivity.this,
                            "Bạn chưa có voucher nào!",
                            Toast.LENGTH_SHORT).show();
                    return;
                }

                // ⭐ LỌC VOUCHER KHẢ DỤNG
                List<UserVoucherItem> filtered = new ArrayList<>();
                for (UserVoucherItem v : items) {

                    boolean outOfUsage = (v.usage_limit > 0 && v.used_count >= v.usage_limit);

                    if (!v.used && !outOfUsage) {
                        filtered.add(v);
                    }
                }

                if (filtered.isEmpty()) {
                    Toast.makeText(CheckoutActivity.this,
                            "Không còn voucher khả dụng!",
                            Toast.LENGTH_SHORT).show();
                    return;
                }

                // ⭐ Tạo danh sách label
                List<String> labels = new ArrayList<>();

                for (UserVoucherItem v : filtered) {

                    String desc = ("percent".equalsIgnoreCase(v.type))
                            ? (v.value + "%")
                            : (formatVND(v.value));

                    String scope = (v.scope != null) ? v.scope : "order";

                    labels.add(v.code + " – " + desc + " (" + scope + ")");
                }

                showVoucherDialogWithObjects(filtered, labels);
            }

            @Override
            public void onFailure(Call<VoucherListRes> call, Throwable t) {
                Toast.makeText(CheckoutActivity.this,
                        "Không tải được voucher!",
                        Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showVoucherDialogWithObjects(List<UserVoucherItem> items, List<String> labels) {
        final boolean[] checked = new boolean[labels.size()];
        String[] arr = labels.toArray(new String[0]);

        for (int i = 0; i < labels.size(); i++) {
            String code = items.get(i).code;
            checked[i] = selectedVouchers.contains(code);
        }

        new android.app.AlertDialog.Builder(this)
                .setTitle("Chọn voucher")
                .setMultiChoiceItems(arr, checked, (d, w, isChecked) -> checked[w] = isChecked)
                .setPositiveButton("Áp dụng", (d, w) -> {

                    selectedVouchers.clear();
                    for (int i = 0; i < labels.size(); i++)
                        if (checked[i]) selectedVouchers.add(items.get(i).code);

                    tvVouchers.setText(
                            selectedVouchers.isEmpty()
                                    ? "(chưa áp dụng)"
                                    : selectedVouchers.toString()
                    );

                    loadQuote(selectedVouchers);
                })
                .setNegativeButton("Hủy", null)
                .show();
    }


    private String formatVND(int v) {
        return NumberFormat.getNumberInstance(new Locale("vi","VN")).format(v) + " đ";
    }

    /* ============================================================
        LOAD QUOTE
      ============================================================ */
    private void loadQuote(ArrayList<String> vouchers) {
        showLoading(true);

        BookingRequest req = new BookingRequest();
        req.showtimeId = showtimeId;
        req.seatIds = seatIds;

        List<ProductQtyAdapter.Row> sel = productAdapter.getSelected();

        req.combos = new ArrayList<>();
        for (ProductQtyAdapter.Row r : sel) {
            BookingRequest.ComboReq c = new BookingRequest.ComboReq();
            c.productId = r.id;
            c.qty = r.qty;
            c.unit_price = r.price;
            c.name = r.name;
            req.combos.add(c);
        }

        req.vouchers = vouchers;

        Log.e("QUOTE_REQ", gson.toJson(req));

        api.quote(req).enqueue(new Callback<BookingQuoteResponse>() {
            @Override public void onResponse(Call<BookingQuoteResponse> call, Response<BookingQuoteResponse> res) {

                Log.e("QUOTE_RES", gson.toJson(res.body()));
                showLoading(false);

                if (!res.isSuccessful() || res.body() == null) {
                    toast("Không tính được tiền!");
                    return;
                }

                BookingQuoteResponse q = res.body();
                int disc = q.breakdown.discount_seat + q.breakdown.discount_combo + q.breakdown.discount_order;

                tvSeatSubtotal.setText("Vé: " + nf.format(q.breakdown.seat_subtotal) + " đ");
                tvComboSubtotal.setText("Combo: " + nf.format(q.breakdown.combo_subtotal) + " đ");
                tvDiscount.setText("Giảm giá: -" + nf.format(disc) + " đ");
                tvTotal.setText("Thành tiền: " + nf.format(q.breakdown.total_after) + " đ");
                tvTotalBottom.setText(nf.format(q.breakdown.total_after) + " đ");
            }

            @Override public void onFailure(Call<BookingQuoteResponse> call, Throwable t) {
                showLoading(false);
                Log.e("QUOTE_ERR", t.getMessage());
            }
        });
    }


    /* ============================================================
        TẠO VÉ + THANH TOÁN VNPay
      ============================================================ */
    private void payWithVnpay() {
        showLoading(true);

        BookingRequest req = new BookingRequest();
        req.showtimeId = showtimeId;
        req.seatIds = seatIds;
        req.vouchers = selectedVouchers;

        req.combos = new ArrayList<>();
        for (ProductQtyAdapter.Row r : productAdapter.getSelected()) {
            BookingRequest.ComboReq c = new BookingRequest.ComboReq();
            c.productId = r.id;
            c.qty = r.qty;
            c.unit_price = r.price;
            c.name = r.name;
            c.type = r.type;
            req.combos.add(c);
        }

        Log.e("BOOKING_REQ", new Gson().toJson(req));

        api.createBooking(null, req).enqueue(new Callback<BookingCreateResponse>() {
            @Override
            public void onResponse(Call<BookingCreateResponse> call, Response<BookingCreateResponse> res) {
                showLoading(false);

                Log.e("BOOKING_RES", new Gson().toJson(res.body()));

                if (!res.isSuccessful() || res.body() == null || res.body().ticket_id == null) {

                    // ⭐ Trả ghế ngay khi lỗi
                    releaseHoldingSeats(seatIds);

                    // ⭐ Lấy lỗi JSON → rồi dịch tiếng Việt
                    String rawErr = extractError(res);
                    String err = translateError(rawErr);

                    showErrorDialog(
                            "Tạo vé thất bại",
                            err,
                            () -> finish()
                    );
                    return;
                }

                // ⭐ Thành công → sang VNPay
                initVnpay(res.body().ticket_id);
            }

            @Override
            public void onFailure(Call<BookingCreateResponse> call, Throwable t) {
                showLoading(false);

                // ⭐ Trả ghế khi lỗi mạng
                releaseHoldingSeats(seatIds);

                Log.e("BOOKING_ERR", "Network error: " + t.getMessage());

                showErrorDialog(
                        "Lỗi kết nối",
                        "Không thể kết nối máy chủ. Vui lòng thử lại.",
                        null
                );
            }
        });




    }
    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == 1001) {

            if (resultCode == RESULT_OK) {
                Log.e("CHECKOUT", "VNPay SUCCESS → không release");
                return;
            }

            // THẤT BẠI, BACK, VUỐT → TRẢ GHẾ
            Log.e("CHECKOUT", "VNPay FAILED/BACK → releaseHoldingSeats()");
            releaseHoldingSeats(seatIds);
        }
    }
    /* ----------------------------------------------------
       RELEASE SEAT
    ---------------------------------------------------- */
    private void releaseHoldingSeats(List<String> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) return;

        // Log debug để xem gửi ghế gì
        Log.e("RELEASE", "Request release seats: " + new Gson().toJson(seatIds));

        // Tạo request body
        ReleaseSeatRequest req = new ReleaseSeatRequest(seatIds);

        // Gọi API - KHÔNG truyền token nữa, Retrofit authed() đã làm rồi
        api.releaseHoldingSeats(req).enqueue(new Callback<BaseResponse>() {
            @Override
            public void onResponse(Call<BaseResponse> call, Response<BaseResponse> res) {
                if (res.isSuccessful()) {
                    Log.e("RELEASE", "Ghế đã được trả lại thành công!");
                } else {
                    Log.e("RELEASE_ERR", "Release failed: " + safeErr(res));
                }
            }

            @Override
            public void onFailure(Call<BaseResponse> call, Throwable t) {
                Log.e("RELEASE_ERR", "Network error: " + t.getMessage());
            }
        });
    }

    private void showErrorDialog(String title, String msg, Runnable onOk) {
        View view = getLayoutInflater().inflate(R.layout.custom_dialog_error, null);

        TextView tvTitle = view.findViewById(R.id.tvTitle);
        TextView tvMessage = view.findViewById(R.id.tvMessage);
        Button btnOk = view.findViewById(R.id.btnOk);

        tvTitle.setText(title);
        tvMessage.setText(msg);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(view)
                .setCancelable(false)
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
    private String extractError(Response<?> res) {
        try {
            if (res.errorBody() != null)
                return res.errorBody().string();
        } catch (Exception ignored) {}
        return "";
    }

    private String translateError(String raw) {
        if (raw == null) return "Đã xảy ra lỗi không xác định";

        raw = raw.toLowerCase();

        if (raw.contains("some seats not available"))
            return "Ghế bạn chọn không còn khả dụng. Vui lòng chọn ghế khác.";

        if (raw.contains("seat already sold"))
            return "Một trong các ghế bạn chọn đã được bán.";

        if (raw.contains("seat holding by another"))
            return "Ghế đang được người khác giữ.";

        if (raw.contains("showtime not found"))
            return "Suất chiếu không tồn tại.";

        if (raw.contains("expired"))
            return "Phiên giữ ghế đã hết hạn.";

        if (raw.contains("invalid voucher"))
            return "Voucher không hợp lệ.";

        if (raw.contains("voucher out of usage"))
            return "Voucher đã hết lượt sử dụng.";

        // fallback
        return "Không thể tạo vé. Vui lòng thử lại.";
    }




    private String safeErr(Response<?> res) {
        try { return res.errorBody() != null ? res.errorBody().string() : "null"; }
        catch (Exception e) { return "error reading errorBody"; }
    }

    /* ============================================================
       GỌI INIT VNPay → LẤY URL THANH TOÁN
     ============================================================ */
    private void initVnpay(String ticketId) {

        PaymentInitReq body = new PaymentInitReq(ticketId, "vnpay");

        Log.e("VNPAY_INIT_REQ", new Gson().toJson(body));

        api.initVnpayPayment("Bearer " + AuthManager.getToken(this), body)
                .enqueue(new Callback<VnPayInitResponse>() {
                    @Override
                    public void onResponse(Call<VnPayInitResponse> call, Response<VnPayInitResponse> res) {

                        Log.e("VNPAY_INIT_RES", new Gson().toJson(res.body()));

                        if (!res.isSuccessful() || res.body() == null) {
                            toast("Không lấy được link thanh toán!");
                            return;
                        }

                        if (res.body().payment_url == null) {
                            Log.e("VNPAY_ERR", "payment_url = null");
                            toast("Không tạo được link VNPAY!");
                            return;
                        }

                        String url = res.body().payment_url;
                        Log.e("VNPAY_URL", url);

                        Intent i = new Intent(CheckoutActivity.this, VnPayActivity.class);
                        i.putExtra("payment_url", url);
                        i.putExtra("ticket_id", ticketId);
                        startActivityForResult(i, 1001);

                    }

                    @Override
                    public void onFailure(Call<VnPayInitResponse> call, Throwable t) {
                        Log.e("VNPAY_ERR", t.getMessage());
                        toast("Lỗi kết nối VNPAY!");
                    }
                });
    }

    /* ===== Helpers ===== */
    private void showLoading(boolean s) { progress.setVisibility(s ? View.VISIBLE : View.GONE); }
    private void toast(String msg) { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show(); }
}
