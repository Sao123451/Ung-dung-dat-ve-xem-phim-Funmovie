package com.example.datn_md_13.utils;

import android.graphics.Rect;
import android.view.View;

import androidx.recyclerview.widget.RecyclerView;

public class GridSpacingDecoration extends RecyclerView.ItemDecoration {
    private final int spanCount;
    private final int h; // horizontal spacing (px)
    private final int v; // vertical spacing (px)
    private final boolean includeEdge;

    public GridSpacingDecoration(int spanCount, int horizontalPx, int verticalPx, boolean includeEdge) {
        this.spanCount = spanCount;
        this.h = horizontalPx;
        this.v = verticalPx;
        this.includeEdge = includeEdge;
    }

    @Override
    public void getItemOffsets(Rect outRect, View view, RecyclerView parent, RecyclerView.State state) {
        int pos = parent.getChildAdapterPosition(view);
        int col = pos % spanCount;

        if (includeEdge) {
            outRect.left  = h - col * h / spanCount;
            outRect.right = (col + 1) * h / spanCount;
            outRect.top   = v;
            outRect.bottom= v;
        } else {
            outRect.left  = col * h / spanCount;
            outRect.right = h - (col + 1) * h / spanCount;
            if (pos >= spanCount) outRect.top = v;
        }
    }
}
