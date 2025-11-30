package com.example.datn_md_13.Fragment;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;

import com.example.datn_md_13.Activity.MemberCardActivity;
import com.example.datn_md_13.Adapter.MoreMenuAdapter;
import com.example.datn_md_13.Model.MoreMenuItem;
import com.example.datn_md_13.R;

import java.util.ArrayList;

public class ProfileFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {

        View v = inflater.inflate(R.layout.fragment_more, container, false);

        androidx.recyclerview.widget.RecyclerView rv = v.findViewById(R.id.rvMoreMenu);

        ArrayList<MoreMenuItem> items = new ArrayList<>();
        items.add(new MoreMenuItem(R.drawable.ic_voucher_free, "Voucher miễn phí", R.color.fm_blue));
        items.add(new MoreMenuItem(R.drawable.ic_cinema, "Rạp phim BETA", R.color.fm_green));
        items.add(new MoreMenuItem(R.drawable.ic_member, "Thành viên BETA", R.color.fm_purple));
        items.add(new MoreMenuItem(R.drawable.ic_notify, "Thông báo", R.color.fm_orange));
        items.add(new MoreMenuItem(R.drawable.ic_job, "Tuyển dụng", R.color.fm_pink));
        items.add(new MoreMenuItem(R.drawable.ic_settings, "Cài đặt", R.color.fm_primary));

        rv.setLayoutManager(new GridLayoutManager(requireContext(), 2));

        rv.setAdapter(new MoreMenuAdapter(items, position -> {
            switch (position) {

                case 0:
                    openFragment(new VoucherFragment());
                    break;

                case 1:
                    openFragment(new CinemaByAreaFragment());
                    break;

                case 2:
                    startActivity(new Intent(requireContext(), MemberCardActivity.class));
                    break;

                case 3:
                    break;

                case 4:
                    break;

                case 5:
                    break;
            }
        }));

        return v;
    }

    private void openFragment(Fragment f) {
        requireActivity().getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.main_container, f)
                .addToBackStack(null)
                .commit();
    }
}
