package br.com.watchhubtlc;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class NotificationRelayService extends NotificationListenerService {

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        AlertEngine.ensureChannel(this);
        AlertEngine.addHistory(this, "ATIVO", "Ponte Android", "Acesso as notificacoes conectado.", "MEDIA", "sistema");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        if (getPackageName().equals(sbn.getPackageName())) return;

        Notification notification = sbn.getNotification();
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        Bundle extras = notification.extras;
        String title = text(extras.getCharSequence(Notification.EXTRA_TITLE));
        String body = text(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (body.isEmpty()) body = text(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (body.isEmpty()) body = text(extras.getCharSequence(Notification.EXTRA_SUB_TEXT));
        if (body.isEmpty()) body = lines(extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES));

        if (title.isEmpty() && body.isEmpty()) return;
        if (!AlertEngine.matchesTlc(this, title, body)) return;

        String signature = sbn.getPackageName() + "|" + AlertEngine.sanitize(title) + "|" + AlertEngine.sanitize(body);
        long now = System.currentTimeMillis();
        String lastSig = AlertEngine.prefs(this).getString("last_relay_sig", "");
        long lastTs = AlertEngine.prefs(this).getLong("last_relay_ts", 0L);
        if (signature.equals(lastSig) && now - lastTs < 8000L) return;
        AlertEngine.prefs(this).edit().putString("last_relay_sig", signature).putLong("last_relay_ts", now).apply();

        String priority = AlertEngine.inferPriority(title + " " + body);
        String outTitle = title.isEmpty() ? "TLC PAINEL" : title;
        AlertEngine.send(this, outTitle, body, priority, "notif:" + sbn.getPackageName());
    }

    private String text(CharSequence value) {
        return value == null ? "" : value.toString();
    }

    private String lines(CharSequence[] values) {
        if (values == null || values.length == 0) return "";
        StringBuilder sb = new StringBuilder();
        for (CharSequence value : values) {
            if (value == null) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(value);
        }
        return sb.toString();
    }
}
