package com.example.datn_md_13.Adapter;

import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.Activity.NewsDetailActivity;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.Model.News;
import com.example.datn_md_13.R;

import java.text.SimpleDateFormat;
import java.util.*;

public class NewsAdapter extends RecyclerView.Adapter<NewsAdapter.VH> {

    private final List<News> data = new ArrayList<>();
    private final SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());

    public void submit(List<News> items) {
        data.clear();
        if (items != null) data.addAll(items);
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_news, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        News n = data.get(position);

        holder.tvTitle.setText(n.title);
        holder.tvDate.setText(n.publishedAt != null ? df.format(n.publishedAt) : "");

        String url = (n.coverImage != null && n.coverImage.startsWith("http"))
                ? n.coverImage
                : ApiClient.absolutePublicUrl(n.coverImage);

        Glide.with(holder.itemView.getContext())
                .load(url)
                .placeholder(R.drawable.bg_avatar_circle)
                .error(R.drawable.bg_avatar_circle)
                .into(holder.img);

        holder.itemView.setOnClickListener(v -> {
            Intent i = new Intent(v.getContext(), NewsDetailActivity.class);
            i.putExtra("slug", n.slug != null ? n.slug : n.id);
            i.putExtra("title", n.title);
            v.getContext().startActivity(i);
        });
    }

    @Override
    public int getItemCount() {
        return data.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        ImageView img;
        TextView tvTitle, tvDate;

        VH(@NonNull View v) {
            super(v);
            img = v.findViewById(R.id.imgThumb);
            tvTitle = v.findViewById(R.id.tvTitle);
            tvDate = v.findViewById(R.id.tvDate);
        }
    }
}
