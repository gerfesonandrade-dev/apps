package br.com.watchhubtlc;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;

import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class AlertEngine {
    public static final String CHANNEL_ID = "watch_hub_tlc";
    public static final String PREFS = "watchhub_tlc_prefs";
    public static final int SAFE_BYTES = 60;
    public static final long GAP_MS = 1500L;
    public static final String DEFAULT_KEYWORDS = "tlc,rota,socorro,atrasad,leite fora,em espera,rota noturna,ja saiu,já saiu,produtor,coleta";

    private AlertEngine() {}

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static String currentMode(Context context) {
        return prefs(context).getString("mode", "TRABALHO");
    }

    public static void setMode(Context context, String mode) {
        prefs(context).edit().putString("mode", mode).apply();
    }

    public static void ensureChannel(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "TLC Watch", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alertas TLC otimizados e enviados ao Chronos");
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }

    public static int send(Context context, String title, String body, String priority, String source) {
        title = sanitize(title);
        body = sanitize(body);
        priority = sanitize(priority).toUpperCase(Locale.ROOT);
        if (priority.isEmpty()) priority = "MEDIA";
        if (body.isEmpty()) {
            addHistory(context, "IGNORADO", title, "Mensagem vazia", priority, source);
            return 0;
        }
        if (!isAllowed(context, priority)) {
            addHistory(context, "BLOQUEADO", title, body, priority, source);
            return -1;
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            addHistory(context, "SEM PERMISSAO", title, body, priority, source);
            return -2;
        }

        ensureChannel(context);
        List<String> chunks = splitForWatch(body, SAFE_BYTES);
        Handler handler = new Handler(Looper.getMainLooper());
        String finalTitle = title.isEmpty() ? "TLC WATCH" : title;
        for (int i = 0; i < chunks.size(); i++) {
            final int idx = i;
            final String chunk = chunks.get(i);
            handler.postDelayed(() -> postNotification(context, finalTitle, chunk, idx), i * GAP_MS);
        }
        addHistory(context, "ENVIADO", finalTitle, body, priority, source);
        return chunks.size();
    }

    private static void postNotification(Context context, String title, String text, int index) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        Notification.Builder builder = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setOnlyAlertOnce(false)
                .setWhen(System.currentTimeMillis());
        int id = (int) (System.currentTimeMillis() % 100000) + index;
        nm.notify(id, builder.build());
    }

    public static boolean isAllowed(Context context, String priority) {
        int p = priorityRank(priority);
        String mode = currentMode(context);
        if ("PLANTAO".equals(mode)) return true;
        if ("TRABALHO".equals(mode)) return p >= 2;
        if ("PESSOAL".equals(mode)) return p >= 3;
        if ("SONO".equals(mode)) return p >= 4;
        return p >= 2;
    }

    public static int priorityRank(String p) {
        if (p == null) return 1;
        String s = sanitize(p).toUpperCase(Locale.ROOT);
        if ("CRITICA".equals(s)) return 4;
        if ("ALTA".equals(s)) return 3;
        if ("MEDIA".equals(s)) return 2;
        return 1;
    }

    public static String inferPriority(String input) {
        String s = sanitize(input).toLowerCase(new Locale("pt", "BR"));
        if (containsAny(s, "socorro", "leite fora", "critica", "crítica", "emergencia", "emergência")) return "CRITICA";
        if (containsAny(s, "atrasad", "urgente", "falha", "risco", "nao saiu", "não saiu")) return "ALTA";
        if (containsAny(s, "em espera", "noturna", "alteracao", "alteração", "ajuste")) return "MEDIA";
        if (containsAny(s, "ja saiu", "já saiu", "concluid", "concluíd", "finaliz")) return "BAIXA";
        return "MEDIA";
    }

    private static boolean containsAny(String s, String... values) {
        for (String v : values) if (s.contains(v)) return true;
        return false;
    }

    public static String getKeywords(Context context) {
        return prefs(context).getString("keywords", DEFAULT_KEYWORDS);
    }

    public static void setKeywords(Context context, String keywords) {
        String value = sanitize(keywords);
        if (value.isEmpty()) value = DEFAULT_KEYWORDS;
        prefs(context).edit().putString("keywords", value).apply();
    }

    public static boolean matchesTlc(Context context, String title, String body) {
        String haystack = (sanitize(title) + " " + sanitize(body)).toLowerCase(new Locale("pt", "BR"));
        if (haystack.trim().isEmpty()) return false;
        String raw = getKeywords(context);
        String[] parts = raw.split(",");
        for (String p : parts) {
            String keyword = sanitize(p).toLowerCase(new Locale("pt", "BR")).trim();
            if (!keyword.isEmpty() && haystack.contains(keyword)) return true;
        }
        return false;
    }

    public static void addHistory(Context context, String status, String title, String body, String priority, String source) {
        SharedPreferences p = prefs(context);
        String stamp = new SimpleDateFormat("dd/MM HH:mm:ss", new Locale("pt", "BR")).format(new Date());
        String line = stamp + " | " + sanitize(status) + " | " + sanitize(priority) + " | " + sanitize(source)
                + "\n" + sanitize(title) + " - " + sanitize(body);
        String old = p.getString("history", "");
        String combined = line + (old.isEmpty() ? "" : "\n\n" + old);
        if (combined.length() > 12000) combined = combined.substring(0, 12000);
        p.edit().putString("history", combined).apply();
    }

    public static String getHistory(Context context) {
        return prefs(context).getString("history", "");
    }

    public static void clearHistory(Context context) {
        prefs(context).edit().remove("history").apply();
    }

    public static List<String> splitForWatch(String text, int maxBytes) {
        String normalized = sanitize(text).replaceAll("\\s+", " ").trim();
        List<String> result = new ArrayList<>();
        if (normalized.isEmpty()) return result;
        if (normalized.getBytes(StandardCharsets.UTF_8).length <= maxBytes) {
            result.add(normalized);
            return result;
        }

        List<String> pieces = new ArrayList<>();
        String remaining = normalized;
        while (!remaining.isEmpty() && pieces.size() < 99) {
            String piece = takePiece(remaining, maxBytes - 6);
            if (piece.isEmpty()) break;
            pieces.add(piece);
            remaining = remaining.substring(piece.length()).trim();
        }
        for (int i = 0; i < pieces.size(); i++) {
            result.add((i + 1) + "/" + pieces.size() + " " + pieces.get(i));
        }
        return result;
    }

    private static String takePiece(String text, int maxBytes) {
        if (text.getBytes(StandardCharsets.UTF_8).length <= maxBytes) return text;
        StringBuilder out = new StringBuilder();
        int lastSpaceLength = -1;
        for (int offset = 0; offset < text.length();) {
            int cp = text.codePointAt(offset);
            String c = new String(Character.toChars(cp));
            String candidate = out.toString() + c;
            if (candidate.getBytes(StandardCharsets.UTF_8).length > maxBytes) break;
            out.append(c);
            if (Character.isWhitespace(cp)) lastSpaceLength = out.length() - 1;
            offset += Character.charCount(cp);
        }
        if (lastSpaceLength > 0) return out.substring(0, lastSpaceLength).trim();
        return out.toString().trim();
    }

    public static String sanitize(String input) {
        if (input == null) return "";
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < input.length();) {
            int cp = input.codePointAt(i);
            i += Character.charCount(cp);
            boolean emoji = (cp >= 0x1F000 && cp <= 0x1FAFF)
                    || (cp >= 0x2600 && cp <= 0x27BF)
                    || (cp >= 0xFE00 && cp <= 0xFE0F)
                    || (cp >= 0x1F1E6 && cp <= 0x1F1FF);
            if (emoji) continue;
            if (Character.isISOControl(cp) && cp != '\n' && cp != '\t') continue;
            out.appendCodePoint(cp);
        }
        return out.toString().replaceAll("\\s+", " ").trim();
    }
}
