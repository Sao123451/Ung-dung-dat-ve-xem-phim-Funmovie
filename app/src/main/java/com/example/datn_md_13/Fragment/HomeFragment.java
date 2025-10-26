package com.example.datn_md_13.Fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.viewpager2.widget.ViewPager2;

import com.example.datn_md_13.Adapter.HomePagerAdapter;
import com.example.datn_md_13.R;
import com.example.datn_md_13.databinding.FragmentHomeBinding;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;

public class HomeFragment extends Fragment {

    private FragmentHomeBinding binding;
    private HomePagerAdapter pagerAdapter;

    // Optional: fragment nào muốn nhận sự kiện reselect thì implement interface này
    public interface OnTabReselected {
        void onTabReselected();
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                              @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Adapter cho ViewPager2
        pagerAdapter = new HomePagerAdapter(this);
        binding.vpStatus.setAdapter(pagerAdapter);
        binding.vpStatus.setOffscreenPageLimit(3);
        binding.vpStatus.setOrientation(ViewPager2.ORIENTATION_HORIZONTAL);

        // Gán tiêu đề (và icon nếu muốn) cho 3 tab
        new TabLayoutMediator(binding.tabStatus, binding.vpStatus, (tab, position) -> {
            switch (position) {
                case 0:
                    tab.setText("Đang chiếu");
                    // tab.setIcon(R.drawable.ic_now);  // nếu bạn có icon
                    break;
                case 1:
                    tab.setText("Sắp chiếu");
                    // tab.setIcon(R.drawable.ic_coming);
                    break;
                default:
                    tab.setText("Suất chiếu sớm");
                    // tab.setIcon(R.drawable.ic_early);
                    break;
            }
        }).attach();

        // Chọn mặc định tab 0
        TabLayout.Tab first = binding.tabStatus.getTabAt(0);
        if (first != null) first.select();

        // Xử lý bấm lại tab hiện tại (reselect) -> gọi onTabReselected nếu fragment có implement
        binding.tabStatus.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab tab) { /* no-op */ }

            @Override public void onTabUnselected(TabLayout.Tab tab) { /* no-op */ }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {
                int pos = tab.getPosition();
                Fragment f = getChildFragmentManager().findFragmentByTag(
                        "f" + pagerAdapter.getItemId(pos)  // tag chuẩn của FragmentStateAdapter
                );
                if (f instanceof OnTabReselected) {
                    ((OnTabReselected) f).onTabReselected();
                }
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
