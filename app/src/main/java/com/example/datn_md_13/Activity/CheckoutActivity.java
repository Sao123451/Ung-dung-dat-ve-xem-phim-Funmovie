package com.example.datn_md_13.Activity;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.ProductQtyAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.BookingCreateResponse;
import com.example.datn_md_13.Model.BookingQuoteResponse;
import com.example.datn_md_13.Model.BookingRequest;
import com.example.datn_md_13.Model.ProductDto;
import com.example.datn_md_13.Model.ProductListRes;
import com.example.datn_md_13.Model.VoucherDto;
import com.example.datn_md_13.Model.VoucherListRes;
import com.example.datn_md_13.R;
import com.example.datn_md_13.AuthManager;
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

    private ProgressBar progress;
    private TextView tvInfo, tvVouchers, tvSeatSubtotal, tvComboSubtotal, tvDiscount, tvTotal, tvTotalBottom;
    private RecyclerView rvProducts;
    private Button btnPay, btnPickVoucher;

    private String showtimeId;
    private ArrayList<String> seatIds;

    private ProductQtyAdapter productAdapter;
    private final ArrayList<String> selectedVouchers = new ArrayList<>();
    private final NumberFormat nf = NumberFormat.getNumberInstance(new Locale("vi","VN"));

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);

        // ❗ DÙNG CLIENT AUTHeD để chèn Bearer tự động
        api = ApiClient.authed(this).create(ApiService.class);

        // Log kiểm tra token hiện đang lưu
        String tk = AuthManager.getToken(this);
        Log.d("AUTH", "Token=" + tk);

        // nhận dữ liệu
        showtimeId = getIntent().getStringExtra("showtime_id");
        seatIds    = getIntent().getStringArrayListExtra("seat_ids");
        if (seatIds == null) seatIds = new ArrayList<>();

        // toolbar
        findViewById(R.id.topBar).setOnClickListener(v -> onBackPressed());
        ((androidx.appcompat.widget.Toolbar)findViewById(R.id.topBar))
                .setNavigationOnClickListener(v -> onBackPressed());

        // bind view
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

        // info tóm tắt
        tvInfo.setText("Ghế đã chọn: " + seatIds.size() + " ghế");

        // products
        rvProducts = findViewById(R.id.rvProducts);
        rvProducts.setLayoutManager(new LinearLayoutManager(this));
        productAdapter = new ProductQtyAdapter(() -> loadQuote(selectedVouchers));
        rvProducts.setAdapter(productAdapter);

        tryLoadProducts();

        // voucher picker
        btnPickVoucher.setOnClickListener(v -> openVoucherPicker());

        // thanh toán (giả lập)
        btnPay.setOnClickListener(v -> pay());

        // quote lần đầu
        loadQuote(selectedVouchers);
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

    /* ===== Voucher Picker ===== */
    private void openVoucherPicker() {
        api.getVouchers().enqueue(new Callback<VoucherListRes>() {
            @Override public void onResponse(Call<VoucherListRes> call, Response<VoucherListRes> res) {
                List<VoucherDto> items = (res.isSuccessful() && res.body()!=null) ? res.body().items : null;
                if (items == null || items.isEmpty()) {
                    showVoucherDialog(Arrays.asList("SEAT10","COMBO20","ORDER30"));
                    return;
                }
                List<String> labels = new ArrayList<>();
                for (VoucherDto v : items) {
                    String desc = v.type!=null && v.value!=null
                            ? ("percent".equalsIgnoreCase(v.type) ? (v.value + "%") : (formatVND(v.value)))
                            : "";
                    String scope = v.scope!=null ? v.scope : "order";
                    labels.add(v.code + " – " + desc + " (" + scope + ")");
                }
                showVoucherDialogWithObjects(items, labels);
            }
            @Override public void onFailure(Call<VoucherListRes> call, Throwable t) {
                showVoucherDialog(Arrays.asList("SEAT10","COMBO20","ORDER30"));
            }
        });
    }

    private void showVoucherDialog(List<String> codes) {
        final boolean[] checked = new boolean[codes.size()];
        for (int i=0;i<codes.size();i++) checked[i] = selectedVouchers.contains(codes.get(i));

        new android.app.AlertDialog.Builder(this)
                .setTitle("Chọn voucher")
                .setMultiChoiceItems(codes.toArray(new String[0]), checked, (d,w,isChecked) -> checked[w] = isChecked)
                .setPositiveButton("Áp dụng", (d,w) -> {
                    selectedVouchers.clear();
                    for (int i=0;i<codes.size();i++) if (checked[i]) selectedVouchers.add(codes.get(i));
                    tvVouchers.setText(selectedVouchers.isEmpty() ? "(chưa áp dụng)" : selectedVouchers.toString());
                    loadQuote(selectedVouchers);
                })
                .setNegativeButton("Hủy", null)
                .show();
    }

    private void showVoucherDialogWithObjects(List<VoucherDto> items, List<String> labels) {
        final boolean[] checked = new boolean[labels.size()];
        String[] arr = labels.toArray(new String[0]);
        for (int i=0;i<labels.size();i++) {
            String code = items.get(i).code;
            checked[i] = selectedVouchers.contains(code);
        }
        new android.app.AlertDialog.Builder(this)
                .setTitle("Chọn voucher")
                .setMultiChoiceItems(arr, checked, (d,w,isChecked) -> checked[w] = isChecked)
                .setPositiveButton("Áp dụng", (d,w) -> {
                    selectedVouchers.clear();
                    for (int i=0;i<labels.size();i++) if (checked[i]) selectedVouchers.add(items.get(i).code);
                    tvVouchers.setText(selectedVouchers.isEmpty() ? "(chưa áp dụng)" : selectedVouchers.toString());
                    loadQuote(selectedVouchers);
                })
                .setNegativeButton("Hủy", null)
                .show();
    }

    private String formatVND(int v) {
        return NumberFormat.getNumberInstance(new Locale("vi","VN")).format(v) + " đ";
    }

    /* ===== Gọi quote ===== */
    private void loadQuote(ArrayList<String> vouchers) {
        showLoading(true);

        BookingRequest req = new BookingRequest();
        req.showtimeId = showtimeId;
        req.seatIds = seatIds;
        req.vouchers = vouchers;

        List<ProductQtyAdapter.Row> sel = productAdapter.getSelected();
        if (!sel.isEmpty()) {
            req.combos = new ArrayList<>();
            for (ProductQtyAdapter.Row r : sel) {
                BookingRequest.ComboReq c = new BookingRequest.ComboReq();
                c.productId = r.id; c.qty = r.qty; c.unit_price = r.price;
                c.name = r.name; c.type = r.type;
                req.combos.add(c);
            }
        }
        Log.d("QUOTE_REQ", new Gson().toJson(req));

        api.quote(req).enqueue(new Callback<BookingQuoteResponse>() {
            @Override public void onResponse(Call<BookingQuoteResponse> call, Response<BookingQuoteResponse> res) {
                showLoading(false);
                if (!res.isSuccessful() || res.body()==null) { toast("Không tính được tiền!"); return; }
                BookingQuoteResponse q = res.body();
                int disc = (q.breakdown.discount_seat + q.breakdown.discount_combo + q.breakdown.discount_order);
                tvSeatSubtotal.setText("Vé: " + nf.format(q.breakdown.seat_subtotal) + " đ");
                tvComboSubtotal.setText("Combo: " + nf.format(q.breakdown.combo_subtotal) + " đ");
                tvDiscount.setText("Giảm giá: -" + nf.format(disc) + " đ");
                tvTotal.setText("Thành tiền: " + nf.format(q.breakdown.total_after) + " đ");
                tvTotalBottom.setText(nf.format(q.breakdown.total_after) + " đ");
            }
            @Override public void onFailure(Call<BookingQuoteResponse> call, Throwable t) {
                showLoading(false); toast("Lỗi kết nối khi tính tiền!");
            }
        });
    }

    /* ===== Thanh toán GIẢ LẬP (có Bearer) ===== */
    private void pay() {
        showLoading(true);

        final String method = "testpay"; // luôn giả lập

        BookingRequest req = new BookingRequest();
        req.showtimeId = showtimeId;
        req.seatIds = seatIds;
        req.payment_method = method;
        req.vouchers = selectedVouchers;

        List<ProductQtyAdapter.Row> sel = productAdapter.getSelected();
        if (!sel.isEmpty()) {
            req.combos = new ArrayList<>();
            for (ProductQtyAdapter.Row r : sel) {
                BookingRequest.ComboReq c = new BookingRequest.ComboReq();
                c.productId = r.id; c.qty = r.qty; c.unit_price = r.price;
                c.name = r.name; c.type = r.type;
                req.combos.add(c);
            }
        }

        // Interceptor sẽ tự thêm Authorization; truyền null để không override
        api.createBooking(null, req).enqueue(new Callback<BookingCreateResponse>() {
            @Override public void onResponse(Call<BookingCreateResponse> call, Response<BookingCreateResponse> res) {
                showLoading(false);
                if (!res.isSuccessful() || res.body()==null || res.body().ticket==null) {
                    toast("Đặt vé thất bại!"); return;
                }
                String ticketId = res.body().ticket.getId();
                new android.app.AlertDialog.Builder(CheckoutActivity.this)
                        .setTitle("Đã tạo vé (giả lập)")
                        .setMessage(
                                "Mã vé: " + ticketId +
                                        "\nTrạng thái: pending / processing" +
                                        "\n\nBạn có thể:\n• POST /api/bookings/" + ticketId + "/confirm để chốt\n" +
                                        "• Hoặc sửa trực tiếp trên Mongo (status='paid', payment_status='paid')\n" +
                                        "• Hoặc POST /api/bookings/" + ticketId + "/cancel để hủy")
                        .setPositiveButton("OK", (d,w) -> finish())
                        .show();
            }
            @Override public void onFailure(Call<BookingCreateResponse> call, Throwable t) {
                showLoading(false); toast("Lỗi kết nối khi tạo vé!");
            }
        });
    }

    /* ===== Helpers ===== */
    private void showLoading(boolean s) { progress.setVisibility(s ? View.VISIBLE : View.GONE); }
    private void toast(String msg) { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show(); }
}
