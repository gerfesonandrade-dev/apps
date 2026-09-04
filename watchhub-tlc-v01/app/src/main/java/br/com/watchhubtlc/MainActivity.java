package br.com.watchhubtlc;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final String CHANNEL_ID = "watch_hub_tlc";
    private static final int REQ_NOTIFICATIONS = 1001;
    private static final int SAFE_BYTES = 60;
    private static final long GAP_MS = 1500L;

    private EditText titleInput;
    private EditText messageInput;
    private TextView byteCounter;
    private TextView preview;
    private NotificationManager notificationManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        notificationManager = getSystemService(NotificationManager.class);
        createChannel();
        requestNotificationPermissionIfNeeded();
        setContentView(buildUi());
        refreshPreview();
    }

    private View buildUi() {
        int pad = dp(18);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setBackgroundColor(Color.rgb(244, 246, 248));

        TextView header = new TextView(this);
        header.setText("Watch Hub + TLC");
        header.setTextSize(26);
        header.setTextColor(Color.rgb(12, 44, 70));
        header.setPadding(0, 0, 0, dp(4));
        root.addView(header);

        TextView subtitle = new TextView(this);
        subtitle.setText("V0.1 - Chronos como ponte para o X5 Pro Max");
        subtitle.setTextSize(14);
        subtitle.setTextColor(Color.DKGRAY);
        subtitle.setPadding(0, 0, 0, dp(18));
        root.addView(subtitle);

        root.addView(cardText("ESTADO\nChronos continua cuidando das notificacoes pessoais. Este app gera alertas TLC otimizados para o relogio."));

        root.addView(label("Titulo"));
        titleInput = new EditText(this);
        titleInput.setSingleLine(true);
        titleInput.setText("TLC WATCH");
        titleInput.setTextSize(16);
        root.addView(titleInput, fullWidth());

        root.addView(label("Mensagem"));
        messageInput = new EditText(this);
        messageInput.setMinLines(4);
        messageInput.setGravity(Gravity.TOP);
        messageInput.setText("Socorro rota 55301. Produtor Jose Silva. Prioridade alta. Motivo leite fora. Confirmar atendimento.");
        messageInput.setTextSize(16);
        root.addView(messageInput, fullWidth());

        byteCounter = new TextView(this);
        byteCounter.setTextSize(13);
        byteCounter.setTextColor(Color.DKGRAY);
        byteCounter.setPadding(0, dp(8), 0, dp(6));
        root.addView(byteCounter);

        Button previewBtn = button("PREVISUALIZAR BLOCOS");
        previewBtn.setOnClickListener(v -> refreshPreview());
        root.addView(previewBtn, fullWidth());

        preview = cardText("");
        preview.setTextIsSelectable(true);
        root.addView(preview);

        Button sendBtn = button("ENVIAR TESTE PARA O RELOGIO");
        sendBtn.setOnClickListener(v -> sendWatchNotification());
        root.addView(sendBtn, fullWidth());

        Button presetSocorro = button("MODELO: SOCORRO");
        presetSocorro.setOnClickListener(v -> {
            titleInput.setText("TLC SOCORRO");
            messageInput.setText("Rota 55301. Produtor Jose Silva. Prioridade alta. Motivo leite fora. Confirmar atendimento.");
            refreshPreview();
        });
        root.addView(presetSocorro, fullWidth());

        Button presetAtraso = button("MODELO: ROTA ATRASADA");
        presetAtraso.setOnClickListener(v -> {
            titleInput.setText("TLC ROTA");
            messageInput.setText("Rota 55015 atrasada. Saida nao registrada. Verificar motorista e informar a operacao.");
            refreshPreview();
        });
        root.addView(presetAtraso, fullWidth());

        root.addView(cardText("REGRAS DA V0.1\n- Sem emoji no texto do relogio\n- Ate 60 bytes por bloco\n- Divisao sem cortar palavras\n- Blocos numerados 1/2, 2/2...\n- Intervalo de 1,5 s entre blocos"));

        messageInput.setOnFocusChangeListener((v, hasFocus) -> { if (!hasFocus) refreshPreview(); });
        titleInput.setOnFocusChangeListener((v, hasFocus) -> { if (!hasFocus) refreshPreview(); });

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        return scroll;
    }

    private void sendWatchNotification() {
        refreshPreview();
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
            Toast.makeText(this, "Autorize notificacoes e toque em enviar novamente.", Toast.LENGTH_LONG).show();
            return;
        }

        String title = sanitize(titleInput.getText().toString().trim());
        String body = sanitize(messageInput.getText().toString().trim());
        if (body.isEmpty()) {
            Toast.makeText(this, "Digite uma mensagem.", Toast.LENGTH_SHORT).show();
            return;
        }

        List<String> chunks = splitForWatch(body, SAFE_BYTES);
        Handler handler = new Handler(Looper.getMainLooper());
        for (int i = 0; i < chunks.size(); i++) {
            final int idx = i;
            final String chunk = chunks.get(i);
            handler.postDelayed(() -> postNotification(title, chunk, idx), i * GAP_MS);
        }
        Toast.makeText(this, "Enviando " + chunks.size() + " bloco(s) para o Chronos.", Toast.LENGTH_LONG).show();
    }

    private void postNotification(String title, String text, int index) {
        Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setOnlyAlertOnce(false)
                .setWhen(System.currentTimeMillis());
        notificationManager.notify((int) (System.currentTimeMillis() % 100000) + index, builder.build());
    }

    private void refreshPreview() {
        if (messageInput == null || byteCounter == null || preview == null) return;
        String clean = sanitize(messageInput.getText().toString().trim());
        int bytes = clean.getBytes(StandardCharsets.UTF_8).length;
        List<String> chunks = splitForWatch(clean, SAFE_BYTES);
        byteCounter.setText("Texto limpo: " + bytes + " bytes | " + chunks.size() + " bloco(s) | limite seguro " + SAFE_BYTES + " bytes");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            sb.append("BLOCO ").append(i + 1).append("/").append(chunks.size()).append("  (")
                    .append(chunks.get(i).getBytes(StandardCharsets.UTF_8).length).append(" bytes)\n")
                    .append(chunks.get(i)).append("\n");
            if (i < chunks.size() - 1) sb.append("\n");
        }
        preview.setText(sb.toString());
    }

    static List<String> splitForWatch(String text, int maxBytes) {
        String normalized = text.replaceAll("\\s+", " ").trim();
        List<String> result = new ArrayList<>();
        if (normalized.isEmpty()) return result;

        String remaining = normalized;
        List<String> pieces = new ArrayList<>();
        int safety = 0;
        while (!remaining.isEmpty() && safety++ < 100) {
            int prefixReserve = 6;
            int available = maxBytes - prefixReserve;
            String piece = takePiece(remaining, available);
            if (piece.isEmpty()) break;
            pieces.add(piece);
            remaining = remaining.substring(piece.length()).trim();
        }
        if (pieces.size() == 1) return pieces;
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

    static String sanitize(String input) {
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

    private void createChannel() {
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "TLC Watch", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alertas enviados ao Chronos e ao relogio X5 Pro Max");
        channel.enableVibration(true);
        notificationManager.createNotificationChannel(channel);
    }

    private void requestNotificationPermissionIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
        }
    }

    private TextView label(String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(14);
        tv.setTextColor(Color.rgb(12, 44, 70));
        tv.setPadding(0, dp(14), 0, dp(4));
        return tv;
    }

    private TextView cardText(String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(14);
        tv.setTextColor(Color.rgb(32, 39, 45));
        tv.setPadding(dp(14), dp(12), dp(14), dp(12));
        tv.setBackgroundColor(Color.WHITE);
        LinearLayout.LayoutParams lp = fullWidth();
        lp.setMargins(0, dp(6), 0, dp(10));
        tv.setLayoutParams(lp);
        return tv;
    }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextSize(14);
        b.setAllCaps(false);
        b.setPadding(dp(10), dp(10), dp(10), dp(10));
        return b;
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
