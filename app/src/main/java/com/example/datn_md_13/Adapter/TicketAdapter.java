package com.example.datn_md_13.Adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.Model.Ticket;
import com.example.datn_md_13.R;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

public class TicketAdapter extends RecyclerView.Adapter<TicketAdapter.ViewHolder> {

    private Context context;
    private List<Ticket> list;
    private OnTicketClick listener;

    public interface OnTicketClick {
        void onClick(Ticket ticket);
    }

    public TicketAdapter(Context context, List<Ticket> list, OnTicketClick listener) {
        this.context = context;
        this.list = list;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(context).inflate(R.layout.item_ticket, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder h, int i) {
        Ticket t = list.get(i);

        // Tên phim
        if (t.movie_snapshot != null && t.movie_snapshot.title != null)
            h.tvMovieName.setText(t.movie_snapshot.title);

        // Tên rạp
        if (t.cinema_snapshot != null)
            h.tvCinema.setText(t.cinema_snapshot.name);

        // Mã vé
        h.tvCode.setText("Mã vé: " + t.reservation_code);

        // Ngày đặt
        h.tvDate.setText("Ngày đặt: " + formatDate(t.createdAt));

        // Suất chiếu
        if (t.showtime_snapshot != null)
            h.tvTime.setText("Suất: "
                    + t.showtime_snapshot.date
                    + " • "
                    + t.showtime_snapshot.time);

        // Tổng tiền
        h.tvTotal.setText(t.total_after + " đ");

        h.itemView.setOnClickListener(v -> listener.onClick(t));
    }


    private String formatDate(String isoDate) {
        if (isoDate == null) return "";
        try {
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            Date d = iso.parse(isoDate);
            SimpleDateFormat out = new SimpleDateFormat("dd/MM/yyyy HH:mm");
            return out.format(d);
        } catch (ParseException e) {
            return isoDate;
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        ImageView imgPoster;
        TextView tvMovieName, tvCinema, tvCode, tvDate, tvTime, tvTotal;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMovieName = itemView.findViewById(R.id.tvMovieName);
            tvCinema = itemView.findViewById(R.id.tvCinema);
            tvCode = itemView.findViewById(R.id.tvCode);
            tvDate = itemView.findViewById(R.id.tvDate);
            tvTime = itemView.findViewById(R.id.tvTime);
            tvTotal = itemView.findViewById(R.id.tvTotal);
        }
    }
}
