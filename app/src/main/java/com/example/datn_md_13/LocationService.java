package com.example.datn_md_13;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

public class LocationService extends Service {

    private FusedLocationProviderClient fusedClient;

    @Override
    public void onCreate() {
        super.onCreate();
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
        startForegroundService();
        startLocationUpdates();
    }

    private void startForegroundService() {
        String channelId = "gps_channel";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "GPS Updates",
                    NotificationManager.IMPORTANCE_LOW
            );
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, channelId)
                .setContentTitle("Đang theo dõi vị trí…")
                .setSmallIcon(R.drawable.ic_location)
                .build();

        startForeground(1, notification);
    }

    @SuppressLint("MissingPermission")
    private void startLocationUpdates() {

        // cập nhật GPS mỗi 5 giây
        LocationRequest req = LocationRequest.create()
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                .setInterval(5000)
                .setFastestInterval(3000);

        fusedClient.requestLocationUpdates(
                req,
                new LocationCallback() {
                    @Override
                    public void onLocationResult(LocationResult result) {
                        Location loc = result.getLastLocation();
                        if (loc != null) {

                            // cập nhật vào MainActivity
                            MainActivity.USER_LAT = loc.getLatitude();
                            MainActivity.USER_LNG = loc.getLongitude();

                            // báo fragment cập nhật UI
                            if (MainActivity.locationLoadedCallback != null) {
                                MainActivity.locationLoadedCallback.onLocationLoaded();
                            }
                        }
                    }
                },
                Looper.getMainLooper()
        );
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
