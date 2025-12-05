package com.example.datn_md_13.Fragment;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.datn_md_13.Activity.MemberCardActivity;
import com.example.datn_md_13.Adapter.MoreMenuAdapter;
import com.example.datn_md_13.Model.MoreMenuItem;
import com.example.datn_md_13.R;
import com.google.android.material.bottomnavigation.BottomNavigationView;

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
        items.add(new MoreMenuItem(R.drawable.ic_voucher, "Voucher miễn phí", R.color.fm_blue));
        items.add(new MoreMenuItem(R.drawable.ic_movie, "Rạp phim FunMovie", R.color.fm_green));
        items.add(new MoreMenuItem(R.drawable.ic_member, "Thành viên FunMovie", R.color.fm_purple));

        rv.setLayoutManager(new LinearLayoutManager(requireContext()));

        rv.setAdapter(new MoreMenuAdapter(items, position -> {

            BottomNavigationView bottomNav = requireActivity().findViewById(R.id.bottom_nav);

            switch (position) {

                case 0: // Voucher
                    bottomNav.setSelectedItemId(R.id.nav_voucher);
                    break;

                case 1: // Rạp chiếu
                    bottomNav.setSelectedItemId(R.id.nav_booking);
                    break;

                case 2: // Thành viên
                    startActivity(new Intent(requireContext(), MemberCardActivity.class));
                    break;
            }
        }));

        return v;
    }
}
