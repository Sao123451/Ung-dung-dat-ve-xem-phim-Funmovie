package com.example.datn_md_13.Activity;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.SimpleResponse;
import com.example.datn_md_13.Model.VoucherAdd;
import com.example.datn_md_13.R;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class activity_add_voucher extends AppCompatActivity {

    private EditText etVoucherCode;
    private Button btnAddVoucher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_voucher);

        etVoucherCode = findViewById(R.id.etVoucherCode);
        btnAddVoucher = findViewById(R.id.btnAddVoucher);

        // Nhấn để thêm voucher
        btnAddVoucher.setOnClickListener(v -> {
            String code = etVoucherCode.getText().toString().trim();

            if (code.isEmpty()) {
                etVoucherCode.setError("Bạn chưa nhập mã voucher!");
                return;
            }

            addVoucher(code);
        });

        // Nút Back
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }

    private void addVoucher(String code) {
        ApiService api = ApiClient.authed(this).create(ApiService.class);

        api.addVoucher(new VoucherAdd(code))
                .enqueue(new Callback<SimpleResponse>() {
                    @Override
                    public void onResponse(Call<SimpleResponse> call, Response<SimpleResponse> response) {

                        if (response.isSuccessful()) {
                            showSuccessDialog(
                                    "Thêm voucher thành công",
                                    "Voucher đã được thêm vào ví của bạn."
                            );
                        } else {
                            showErrorDialog(
                                    "Không thể thêm voucher",
                                    "Mã voucher không hợp lệ hoặc bạn đã nhận voucher này rồi."
                            );
                        }
                    }

                    @Override
                    public void onFailure(Call<SimpleResponse> call, Throwable t) {
                        showErrorDialog(
                                "Lỗi kết nối",
                                "Không thể kết nối tới máy chủ. Vui lòng thử lại."
                        );
                    }
                });
    }

    /* ----------------------------------------------------
     *  Dialog Error – custom layout (custom_dialog_error)
     * ---------------------------------------------------- */
    private void showErrorDialog(String title, String msg) {
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
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));

        btnOk.setOnClickListener(v -> dialog.dismiss());
        dialog.show();
    }

    /* ----------------------------------------------------
     *  Dialog Success – custom layout (custom_dialog_success)
     * ---------------------------------------------------- */
    private void showSuccessDialog(String title, String msg) {
        View view = getLayoutInflater().inflate(R.layout.custom_dialog_success, null);

        TextView tvTitle = view.findViewById(R.id.tvSuccessTitle);
        TextView tvMessage = view.findViewById(R.id.tvSuccessMessage);
        Button btnOk = view.findViewById(R.id.btnSuccessOk);

        tvTitle.setText(title);
        tvMessage.setText(msg);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(view)
                .create();

        if (dialog.getWindow() != null)
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));

        btnOk.setOnClickListener(v -> {
            dialog.dismiss();
            finish(); // trở về màn voucher
        });

        dialog.show();
    }
}
