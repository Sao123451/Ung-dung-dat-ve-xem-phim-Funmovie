package com.example.datn_md_13.Adapter;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.viewpager2.adapter.FragmentStateAdapter;

import com.example.datn_md_13.Fragment.ComingSoonFragment;
import com.example.datn_md_13.Fragment.EarlyShowFragment;
import com.example.datn_md_13.Fragment.NowShowingFragment;

public class HomePagerAdapter extends FragmentStateAdapter {

    public HomePagerAdapter(@NonNull Fragment parent) {
        super(parent);
    }

    @NonNull
    @Override
    public Fragment createFragment(int position) {
        switch (position) {
            case 0:
                return new NowShowingFragment();
            case 1:
                return new ComingSoonFragment();
            default:
                return new EarlyShowFragment();
        }
    }

    @Override
    public int getItemCount() {
        return 3;
    }
}
